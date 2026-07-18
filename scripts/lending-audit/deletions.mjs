import { audit, test, submit, createdId, entry } from './core.mjs'

export async function testEmptyObjectDeletion(client, wallets, mptID) {
  const { broker } = wallets
  const vaultResponse = await submit(client, 'VaultCreate:deletion test', {
    TransactionType: 'VaultCreate',
    Account: broker.address,
    Asset: { mpt_issuance_id: mptID },
    AssetsMaximum: '1000'
  }, broker)
  const vaultID = createdId(vaultResponse, 'Vault')

  const brokerResponse = await submit(client, 'LoanBrokerSet:deletion test', {
    TransactionType: 'LoanBrokerSet',
    Account: broker.address,
    VaultID: vaultID,
    DebtMaximum: '1000'
  }, broker)
  const loanBrokerID = createdId(brokerResponse, 'LoanBroker')

  await submit(client, 'LoanBrokerDelete:empty', {
    TransactionType: 'LoanBrokerDelete',
    Account: broker.address,
    LoanBrokerID: loanBrokerID
  }, broker)
  await submit(client, 'VaultDelete:empty', {
    TransactionType: 'VaultDelete',
    Account: broker.address,
    VaultID: vaultID
  }, broker)

  audit.objects.empty_delete_verification = await test('verify empty Broker and Vault deletion', async () => {
    const result = {}
    try { await entry(client, loanBrokerID); result.broker_deleted = false } catch { result.broker_deleted = true }
    try { await entry(client, vaultID); result.vault_deleted = false } catch { result.vault_deleted = true }
    return result
  }, true)
}
