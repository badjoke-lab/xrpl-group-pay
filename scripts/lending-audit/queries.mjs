import { audit, test, rpc } from './core.mjs'

export async function testHistoryQueries(client, wallets) {
  const { broker, borrower } = wallets
  audit.objects.account_objects_loan = await test('account_objects type=loan', () => rpc(client, {
    command: 'account_objects',
    account: borrower.address,
    type: 'loan',
    ledger_index: 'validated'
  }), true)
  audit.objects.account_objects_broker = await test('account_objects type=loan_broker', () => rpc(client, {
    command: 'account_objects',
    account: broker.address,
    type: 'loan_broker',
    ledger_index: 'validated'
  }), true)
  audit.objects.account_tx_broker = await test('account_tx broker history', () => rpc(client, {
    command: 'account_tx',
    account: broker.address,
    ledger_index_min: -1,
    ledger_index_max: -1,
    binary: false,
    forward: false,
    limit: 200
  }), true)
  audit.objects.account_tx_borrower = await test('account_tx borrower history', () => rpc(client, {
    command: 'account_tx',
    account: borrower.address,
    ledger_index_min: -1,
    ledger_index_max: -1,
    binary: false,
    forward: false,
    limit: 200
  }), true)
}
