import { xrpl, audit, submit, mpt } from './core.mjs'

export async function createAuditMpt(client, wallets) {
  const { broker, borrower, issuer } = wallets
  const response = await submit(client, 'MPTokenIssuanceCreate', {
    TransactionType: 'MPTokenIssuanceCreate',
    Account: issuer.address,
    MaximumAmount: '100000000',
    TransferFee: 0,
    Flags:
      xrpl.MPTokenIssuanceCreateFlags.tfMPTCanTransfer |
      xrpl.MPTokenIssuanceCreateFlags.tfMPTCanClawback |
      xrpl.MPTokenIssuanceCreateFlags.tfMPTCanTrade,
    MPTokenMetadata: xrpl.encodeMPTokenMetadata({
      ticker: 'AUDT',
      name: 'Lending Audit Token',
      desc: 'Ephemeral XRPL Devnet audit token',
      asset_class: 'rwa',
      asset_subclass: 'stablecoin',
      issuer_name: 'Audit'
    })
  }, issuer)
  const mptID = response.result.meta.mpt_issuance_id
  audit.objects.mptID = mptID

  for (const [role, wallet] of [['broker', broker], ['borrower', borrower]]) {
    await submit(client, `MPTokenAuthorize:${role}`, {
      TransactionType: 'MPTokenAuthorize',
      Account: wallet.address,
      MPTokenIssuanceID: mptID
    }, wallet)
  }

  await submit(client, 'Payment:MPT broker', {
    TransactionType: 'Payment',
    Account: issuer.address,
    Destination: broker.address,
    Amount: mpt(mptID, '500000')
  }, issuer)
  await submit(client, 'Payment:MPT borrower', {
    TransactionType: 'Payment',
    Account: issuer.address,
    Destination: borrower.address,
    Amount: mpt(mptID, '500000')
  }, issuer)

  return mptID
}
