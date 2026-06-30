import { xrpl, audit, test, rpc, submit, createdId, entry } from './core.mjs'

export async function createAndReadLoanBroker(client, wallets, vaultID) {
  const { broker } = wallets
  const response = await submit(client, 'LoanBrokerSet:create all fields', {
    TransactionType: 'LoanBrokerSet',
    Account: broker.address,
    VaultID: vaultID,
    Data: xrpl.convertStringToHex('audit-broker-v1'),
    ManagementFeeRate: 250,
    DebtMaximum: '10000000',
    CoverRateMinimum: 10000,
    CoverRateLiquidation: 5000
  }, broker)
  const loanBrokerID = createdId(response, 'LoanBroker')
  audit.objects.loanBrokerID = loanBrokerID
  audit.objects.broker_created = await test(
    'read LoanBroker after create',
    () => entry(client, loanBrokerID),
    true
  )

  if (audit.objects.broker_created.Account) {
    audit.objects.broker_pseudo = await test('LoanBroker pseudo-account back-pointer', () => rpc(client, {
      command: 'account_info',
      account: audit.objects.broker_created.Account,
      ledger_index: 'validated'
    }), true)
  }

  await submit(client, 'LoanBrokerSet:update', {
    TransactionType: 'LoanBrokerSet',
    Account: broker.address,
    VaultID: vaultID,
    LoanBrokerID: loanBrokerID,
    DebtMaximum: '12000000',
    Data: xrpl.convertStringToHex('audit-broker-v2')
  }, broker)

  audit.objects.broker_updated = await test(
    'read LoanBroker after update',
    () => entry(client, loanBrokerID),
    true
  )
  return loanBrokerID
}
