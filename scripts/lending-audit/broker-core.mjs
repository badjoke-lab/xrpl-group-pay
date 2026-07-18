import { xrpl, audit, test, rpc, submit, createdId, entry, mpt } from './core.mjs'

export async function createAndReadLoanBroker(client, wallets, vaultID, mptID) {
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

  await submit(client, 'LoanBrokerCoverDeposit:fund lending tests', {
    TransactionType: 'LoanBrokerCoverDeposit',
    Account: broker.address,
    LoanBrokerID: loanBrokerID,
    Amount: mpt(mptID, '50000')
  }, broker)

  audit.objects.broker_updated = await test(
    'read LoanBroker after update and cover deposit',
    () => entry(client, loanBrokerID),
    true
  )
  return loanBrokerID
}
