import { xrpl, audit, test, submit, entry } from './core.mjs'

export async function testLoanManageFlags(client, wallets, loanID) {
  const { broker } = wallets
  await submit(client, 'LoanManage:impair configured loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: loanID,
    Flags: xrpl.LoanManageFlags.tfLoanImpair
  }, broker)
  audit.objects.configured_loan_impaired = await test(
    'read configured loan while impaired',
    () => entry(client, loanID),
    true
  )
  await submit(client, 'LoanManage:unimpair configured loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: loanID,
    Flags: xrpl.LoanManageFlags.tfLoanUnimpair
  }, broker)
  audit.objects.configured_loan_unimpaired = await test(
    'read configured loan after unimpair',
    () => entry(client, loanID),
    true
  )
}
