import xrpl from 'xrpl'

const client = new xrpl.Client('wss://s.devnet.rippletest.net:51233')
await client.connect()
console.log((await client.request({ command: 'server_info' })).result.info.validated_ledger)
await client.disconnect()
