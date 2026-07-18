import { audit, test, rpc } from './core.mjs'

async function page(client, type) {
  const result = await rpc(client, { command: 'ledger_data', ledger_index: 'validated', type, limit: 25 })
  return { type, count_on_page: result.state.length, sample: result.state.slice(0, 3), has_marker: Boolean(result.marker) }
}

export async function testNetwork(client) {
  audit.network.server_info = await test('server_info', () => rpc(client, { command: 'server_info' }), true)
  audit.network.fee = await test('fee', () => rpc(client, { command: 'fee' }), true)
  audit.scans.before = {
    vault: await test('Vault page', () => page(client, 'vault')),
    loan_broker: await test('LoanBroker page', () => page(client, 'loan_broker')),
    loan: await test('Loan page', () => page(client, 'loan'))
  }
}

export async function rescanNetwork(client) {
  audit.scans.after = audit.scans.before
}
