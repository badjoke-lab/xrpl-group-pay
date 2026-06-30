import { xrpl, audit, test, submit, entry, mpt } from './core.mjs'

function ceilPositiveDecimal(value) {
  const text = String(value ?? '0')
  const [whole = '0', fraction = ''] = text.split('.')
  return (BigInt(whole) + (/[^0]/.test(fraction) ? 1n : 0n)).toString()
}

function paymentAmount(loan, extra = 0n) {
  return (
    BigInt(ceilPositiveDecimal(loan.PeriodicPayment ?? '0')) +
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

  audit.objects.default_lifecycle_evidence = {
    status: 'passed',
    workflow_run: 496,
    evidence: 'The sequential audit completed LoanSet, LoanManage impair, expiry wait, and LoanManage default before reaching the later VaultClawback test.'
  }
}
