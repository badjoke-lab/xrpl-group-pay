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

function addDecimalStrings(...values) {
  const parsed = values.map(value => {
    const text = String(value ?? '0')
    const negative = text.startsWith('-')
    const unsigned = negative ? text.slice(1) : text
    const [whole = '0', fraction = ''] = unsigned.split('.')
    return { negative, whole, fraction }
  })
  const scale = Math.max(...parsed.map(item => item.fraction.length))
  const total = parsed.reduce((sum, item) => {
    const digits = `${item.whole}${item.fraction.padEnd(scale, '0')}` || '0'
    return sum + (item.negative ? -BigInt(digits) : BigInt(digits))
  }, 0n)
  const negative = total < 0n
  const absolute = (negative ? -total : total).toString().padStart(scale + 1, '0')
  if (scale === 0) return `${negative ? '-' : ''}${absolute}`
  const whole = absolute.slice(0, -scale) || '0'
  const fraction = absolute.slice(-scale).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

function paymentAmount(loan, extra = '0') {
  return addDecimalStrings(
    loan.PeriodicPayment ?? '0',
    loan.LoanServiceFee ?? '0',
    extra
  )
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
    Amount: mpt(mptID, paymentAmount(current, '10')),
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
  const waitSeconds = Math.max(0, eligibleAt - rippleNow + 2)
  if (waitSeconds > 150) throw new Error(`Unexpected default wait: ${waitSeconds}s`)
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
