import {
  xrpl,
  audit,
  test,
  submit,
  submitLoanSet,
  createdId,
  entry,
  sleep
} from './core.mjs'

export async function testLoanDefault(client, wallets, loanBrokerID) {
  const { broker, borrower } = wallets
  const transaction = {
    TransactionType: 'LoanSet',
    Account: broker.address,
    Counterparty: borrower.address,
    LoanBrokerID: loanBrokerID,
    PrincipalRequested: '500',
    InterestRate: 0,
    PaymentTotal: 1,
    PaymentInterval: 60,
    GracePeriod: 5,
    LoanOriginationFee: '0',
    LoanServiceFee: '0',
    LatePaymentFee: '0',
    ClosePaymentFee: '0',
    OverpaymentFee: 0,
    Data: xrpl.convertStringToHex('audit-default-loan')
  }

  const response = await submitLoanSet(
    client,
    'LoanSet:short default test',
    transaction,
    broker,
    borrower
  )
  const loanID = createdId(response, 'Loan')
  audit.objects.defaultLoanID = loanID
  audit.objects.default_loan_created = await test(
    'read short default loan after create',
    () => entry(client, loanID),
    true
  )

  await submit(client, 'LoanManage:impair short default loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: loanID,
    Flags: xrpl.LoanManageFlags.tfLoanImpair
  }, broker)

  const impaired = await test(
    'read short default loan while impaired',
    () => entry(client, loanID),
    true
  )
  audit.objects.default_loan_impaired = impaired

  const rippleNow = Math.floor(Date.now() / 1000) - 946684800
  const eligibleAt = Number(impaired.NextPaymentDueDate) + Number(impaired.GracePeriod ?? 0)
  const waitSeconds = Math.max(0, eligibleAt - rippleNow + 2)
  if (waitSeconds > 90) {
    throw new Error(`Default eligibility wait unexpectedly long: ${waitSeconds}s`)
  }
  await test('wait for short loan default eligibility', async () => {
    await sleep(waitSeconds * 1000)
    return { waitSeconds, eligibleAt }
  }, true)

  await submit(client, 'LoanManage:default short loan', {
    TransactionType: 'LoanManage',
    Account: broker.address,
    LoanID: loanID,
    Flags: xrpl.LoanManageFlags.tfLoanDefault
  }, broker)

  audit.objects.default_loan_final = await test(
    'read short loan after default',
    () => entry(client, loanID),
    true
  )
  return loanID
}
