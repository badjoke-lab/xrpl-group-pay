import { xrpl, audit, test, rpc, submit, createdId, entry } from './core.mjs'

export async function testXrpVault(client, wallets) {
  const { broker, xrpDepositor } = wallets
  const response = await submit(client, 'VaultCreate:XRP', {
    TransactionType: 'VaultCreate',
    Account: broker.address,
    Asset: { currency: 'XRP' },
    AssetsMaximum: '50000000',
    WithdrawalPolicy: 1,
    Data: xrpl.convertStringToHex('xrp-vault')
  }, broker)
  const vaultID = createdId(response, 'Vault')
  await submit(client, 'VaultDeposit:XRP', {
    TransactionType: 'VaultDeposit',
    Account: xrpDepositor.address,
    VaultID: vaultID,
    Amount: '10000000'
  }, xrpDepositor)
  audit.objects.xrp_vault = await test('read XRP Vault', () => entry(client, vaultID), true)
  audit.objects.xrp_vault_info = await test('vault_info XRP', () => rpc(client, {
    command: 'vault_info',
    vault_id: vaultID,
    ledger_index: 'validated'
  }), true)
  return vaultID
}
