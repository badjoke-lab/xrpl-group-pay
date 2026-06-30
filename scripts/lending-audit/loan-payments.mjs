import {
  xrpl,
  audit,
  test,
  submit,
  submitLoanSet,
  createdId,
  entry,
  mpt,
  sleep
} from './core.mjs'

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
  const { broker, borrower } = wallets
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

  const defaultResponse = await submitLoanSet(client, 'LoanSet:short default test', {
    TransactionType: 'LoanSet',
    Account: broker.address,
    Counterparty: borrower.address,
    LoanBrokerID: current.LoanBrokerID,
    PrincipalRequested: '500',
    InterestRate: 0,
    PaymentTotal: 1,
    PaymentInterval: 60,
    GracePeriod: 60,
    LoanOriginationFee: '0',
    LoanServiceFee: '0',
    LatePaymentFee: '0',
    ClosePaymentFee: '0',
    OverpaymentFee: 0,
    Data: xrpl.convertStringToHex('audit-default-loan')
  }, broker, borrower)
  const defaultLoanID = createdId(defaultResponse, 'Loan')
  audit.objects.defaultLoanID = defaultLoanID

  await submit(client, 'LoanManage:impair short default loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: defaultLoanID,
    Flags: xrpl.LoanManageFlags.tfLoanImpair
  }, broker)
  const impaired = await test(
    'read short default loan while impaired',
    () => entry(client, defaultLoanID),
    true
  )
  audit.objects.default_loan_impaired = impaired

  const rippleNow = Math.floor(Date.now() / 1000) - 946684800
  const eligibleAt = Number(impaired.NextPaymentDueDate) + Number(impaired.GracePeriod ?? 0)
  const waitSeconds = Math.max(0, eligibleAt - rippleNow + 10)
  if (waitSeconds > 160) throw new Error(`Unexpected default wait: ${waitSeconds}s`)
  await test('wait for short loan default eligibility', async () => {
    await sleep(waitSeconds * 1000)
    return { waitSeconds, eligibleAt }
  }, true)

  await submit(client, 'LoanManage:default short loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: defaultLoanID,
    Flags: xrpl.LoanManageFlags.tfLoanDefault
  }, broker)
  audit.objects.default_loan_final = await test(
    'read short loan after default',
    () => entry(client, defaultLoanID),
    true
  )
}
