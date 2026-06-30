import { xrpl, audit, test, submit, entry, mpt } from './core.mjs'

function paymentAmount(loan, extra = 0n) {
  return (
    BigInt(loan.PeriodicPayment ?? '0') +
    BigInt(loan.LoanServiceFee ?? '0') +
    extra
  ).toString()
}

export async function testLoanPaymentModes(client, wallets, loanID, mptID) {
  const { borrower } = wallets
  const before = await test('read configured loan before payment', () => entry(client, loanID), true)
  await submit(client, 'LoanPay:regular configured loan', {
    TransactionType: 'LoanPay',
    Account: borrower.address,
    LoanID: loanID,
    Amount: mpt(mptID, paymentAmount(before))
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
    Amount: mpt(mptID, paymentAmount(current, 10n)),
    Flags: xrpl.LoanPayFlags.tfLoanOverpayment
  }, borrower, false)
  audit.objects.configured_loan_after_overpayment = await test(
    'read configured loan after overpayment probe',
    () => entry(client, loanID)
  )
}
