import { xrpl, audit, test, submit, entry, mpt } from './core.mjs'

export async function testLoanPaymentModes(client, wallets, loanID, mptID) {
  const { borrower } = wallets
  const before = await test('read configured loan before payment', () => entry(client, loanID), true)
  await submit(client, 'LoanPay:regular configured loan', {
    TransactionType: 'LoanPay',
    Account: borrower.address,
    LoanID: loanID,
    Amount: mpt(mptID, before.PeriodicPayment ?? '400')
  }, borrower)
  audit.objects.configured_loan_after_regular = await test(
    'read configured loan after regular payment',
    () => entry(client, loanID),
    true
  )

  const current = audit.objects.configured_loan_after_regular
  await submit(client, 'LoanPay:overpayment configured loan', {
    TransactionType: 'LoanPay',
    Account: borrower.address,
    LoanID: loanID,
    Amount: mpt(mptID, (BigInt(current.PeriodicPayment ?? '1') + 10n).toString()),
    Flags: xrpl.LoanPayFlags.tfLoanOverpayment
  }, borrower, false)
  audit.objects.configured_loan_after_overpayment = await test(
    'read configured loan after overpayment probe',
    () => entry(client, loanID)
  )
}
