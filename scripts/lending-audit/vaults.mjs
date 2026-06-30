import {
  xrpl,
  audit,
  test,
  rpc,
  submit,
  createdId,
  entry,
  mpt
} from './core.mjs'

export async function testPrimaryVault(client, wallets, mptID, domainID) {
  const { broker, issuer, borrower } = wallets
  const response = await submit(client, 'VaultCreate:private MPT all options', {
    TransactionType: 'VaultCreate',
    Account: broker.address,
    Asset: { mpt_issuance_id: mptID },
    Flags:
      xrpl.VaultCreateFlags.tfVaultPrivate |
      xrpl.VaultCreateFlags.tfVaultShareNonTransferable,
    DomainID: domainID,
    AssetsMaximum: '80000000',
    WithdrawalPolicy: 1,
    Data: xrpl.convertStringToHex('audit-private-vault-v1'),
    MPTokenMetadata: xrpl.encodeMPTokenMetadata({
      ticker: 'vAUDT',
      name: 'Audit Vault Share',
      desc: 'Audit share',
      asset_class: 'other'
    })
  }, broker)
  const vaultID = createdId(response, 'Vault')
  audit.objects.vaultID = vaultID

  audit.objects.vault_created = await test('read Vault after create', () => entry(client, vaultID), true)
  audit.objects.vault_info_created = await test('vault_info after create', () => rpc(client, {
    command: 'vault_info',
    vault_id: vaultID,
    ledger_index: 'validated'
  }), true)

  if (audit.objects.vault_created.Account) {
    audit.objects.vault_pseudo = await test('Vault pseudo-account back-pointer', () => rpc(client, {
      command: 'account_info',
      account: audit.objects.vault_created.Account,
      ledger_index: 'validated'
    }), true)
  }

  await submit(client, 'VaultDeposit', {
    TransactionType: 'VaultDeposit',
    Account: issuer.address,
    VaultID: vaultID,
    Amount: mpt(mptID, '50000000')
  }, issuer)
  audit.objects.vault_deposited = await test('read Vault after deposit', () => entry(client, vaultID), true)

  await submit(client, 'VaultWithdraw destination/tag', {
    TransactionType: 'VaultWithdraw',
    Account: issuer.address,
    VaultID: vaultID,
    Amount: mpt(mptID, '1000'),
    Destination: borrower.address,
    DestinationTag: 4242
  }, issuer)

  await submit(client, 'VaultSet mutable fields', {
    TransactionType: 'VaultSet',
    Account: broker.address,
    VaultID: vaultID,
    AssetsMaximum: '90000000',
    DomainID: domainID,
    Data: xrpl.convertStringToHex('audit-private-vault-v2')
  }, broker)

  audit.objects.vault_final = await test('read Vault after VaultSet', () => entry(client, vaultID), true)
  audit.objects.vault_info_final = await test('vault_info final', () => rpc(client, {
    command: 'vault_info',
    vault_id: vaultID,
    ledger_index: 'validated'
  }), true)

  return vaultID
}

export async function testVaultClawback(client, wallets, mptID) {
  const { broker, issuer } = wallets
  const response = await submit(client, 'VaultCreate:clawback', {
    TransactionType: 'VaultCreate',
    Account: broker.address,
    Asset: { mpt_issuance_id: mptID },
    AssetsMaximum: '100000',
    Data: xrpl.convertStringToHex('clawback-vault')
  }, broker)
  const vaultID = createdId(response, 'Vault')
  await submit(client, 'VaultDeposit:clawback', {
    TransactionType: 'VaultDeposit',
    Account: issuer.address,
    VaultID: vaultID,
    Amount: mpt(mptID, '10000')
  }, issuer)
  await submit(client, 'VaultClawback', {
    TransactionType: 'VaultClawback',
    Account: issuer.address,
    VaultID: vaultID,
    Holder: issuer.address,
    Amount: mpt(mptID, '1000')
  }, issuer)
  audit.objects.clawback_vault = await test('read Vault after VaultClawback', () => entry(client, vaultID), true)
  return vaultID
}
