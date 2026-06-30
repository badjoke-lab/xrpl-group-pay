import { xrpl, audit, submitLoanSet, createdId, entry } from './core.mjs'

export async function createConfiguredLoan(client, wallets, loanBrokerID) {
  const { broker, borrower } = wallets
  const transaction = {
    TransactionType: 'LoanSet',
    Account: broker.address,
    Counterparty: borrower.address,
    LoanBrokerID: loanBrokerID,
    PrincipalRequested: '1000',
    InterestRate: 500,
    LateInterestRate: 250,
    CloseInterestRate: 125,
    OverpaymentInterestRate: 100,
    PaymentTotal: 3,
    PaymentInterval: 60,
    GracePeriod: 60,
    LoanOriginationFee: '10',
    LoanServiceFee: '2',
    LatePaymentFee: '3',
    ClosePaymentFee: '4',
    OverpaymentFee: 75,
    Flags: xrpl.LoanSetFlags.tfLoanOverpayment,
    Data: xrpl.convertStringToHex('audit-configured-loan')
  }
  const response = await submitLoanSet(
    client,
    'LoanSet:all configurable fields',
    transaction,
    broker,
    borrower
  )
  const loanID = createdId(response, 'Loan')
  audit.objects.configuredLoanID = loanID
  audit.objects.configured_loan_created = await entry(client, loanID)
  return loanID
}
