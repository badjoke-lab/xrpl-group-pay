import { audit, test, rpc, scan } from './core.mjs'

export async function testNetwork(client) {
  audit.network.server_info = await test('RPC server_info', () => rpc(client, {
    command: 'server_info',
    counters: false
  }), true)
  audit.network.fee = await test('RPC fee', () => rpc(client, { command: 'fee' }), true)
  audit.network.version = await test('RPC version', () => rpc(client, { command: 'version' }))
  audit.network.feature = await test('RPC feature', () => rpc(client, { command: 'feature' }))
  audit.network.server_definitions = await test('RPC server_definitions', () => rpc(client, {
    command: 'server_definitions'
  }))
  await test('WebSocket subscribe/unsubscribe ledger', async () => {
    const subscribed = await rpc(client, { command: 'subscribe', streams: ['ledger'] })
    await rpc(client, { command: 'unsubscribe', streams: ['ledger'] })
    return subscribed
  }, true)

  audit.scans.before = {
    vault: await test('ledger_data type=vault', () => scan(client, 'vault')),
    loan_broker: await test('ledger_data type=loan_broker', () => scan(client, 'loan_broker')),
    loan: await test('ledger_data type=loan', () => scan(client, 'loan'))
  }
}

export async function rescanNetwork(client) {
  audit.scans.after = {
    vault: await test('rescan ledger_data type=vault', () => scan(client, 'vault')),
    loan_broker: await test('rescan ledger_data type=loan_broker', () => scan(client, 'loan_broker')),
    loan: await test('rescan ledger_data type=loan', () => scan(client, 'loan'))
  }
}
