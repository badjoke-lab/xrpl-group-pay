import { execFileSync } from 'node:child_process'
import { audit, test, connect, xrpl } from './core.mjs'
import { testNetwork, rescanNetwork } from './network.mjs'
import { fundAuditWallets } from './wallets.mjs'
import { createAuditMpt } from './mpt.mjs'
import { createPermissioning } from './credentials.mjs'
import { testPrimaryVault, testVaultClawback } from './vaults.mjs'
import { createAndReadLoanBroker } from './broker-core.mjs'
import { createConfiguredLoan } from './loan-create.mjs'
import { testLoanManageFlags } from './loan-manage.mjs'
import { testLoanPaymentModes } from './loan-payments.mjs'
import { testXrpVault } from './vault-xrp.mjs'
import { testEmptyObjectDeletion } from './deletions.mjs'
import { testHistoryQueries } from './queries.mjs'
import { inspectOfficialSampleObjects } from './official-inspect.mjs'
import { renderAudit } from './render.mjs'

await test('run official XRPL lending tutorial lifecycle', () => {
  execFileSync('bash', ['scripts/lending-audit/run-official-samples.sh'], {
    stdio: 'inherit',
    env: process.env
  })
  return { completed: true }
}, true)

const client = await test('connect XRPL Lending Devnet', connect, true)
try {
  await testNetwork(client)
  const wallets = await fundAuditWallets(client)
  const mptID = await createAuditMpt(client, wallets)
  const { domainID } = await createPermissioning(client, wallets)
  const vaultID = await testPrimaryVault(client, wallets, mptID, domainID)
  const loanBrokerID = await createAndReadLoanBroker(client, wallets, vaultID)
  const configuredLoanID = await createConfiguredLoan(client, wallets, loanBrokerID)
  await testLoanManageFlags(client, wallets, configuredLoanID)
  await testLoanPaymentModes(client, wallets, configuredLoanID, mptID)
  await testVaultClawback(client, wallets, mptID)
  await testXrpVault(client, wallets)
  await testEmptyObjectDeletion(client, wallets, mptID)
  await testHistoryQueries(client, wallets)
  await inspectOfficialSampleObjects(client)

  await test('validate IOU VaultCreate with Scale', () => {
    const transaction = {
      TransactionType: 'VaultCreate',
      Account: wallets.broker.address,
      Asset: { currency: 'AUD', issuer: wallets.iouIssuer.address },
      AssetsMaximum: '500000',
      Scale: 6,
      WithdrawalPolicy: 1,
      Data: xrpl.convertStringToHex('iou-scale-validation')
    }
    xrpl.validate(transaction)
    audit.objects.iou_vault_schema_probe = transaction
    return { valid: true, note: 'Schema validation only; live IOU deposit was not required for the lending lifecycle.' }
  }, true)

  await rescanNetwork(client)
} finally {
  try { await client.disconnect() } catch {}
}

const summary = await renderAudit()
if (summary.critical > 0) process.exitCode = 1
