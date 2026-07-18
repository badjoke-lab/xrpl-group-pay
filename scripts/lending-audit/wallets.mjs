import { audit, test, rememberSecret } from './core.mjs'

export async function fundAuditWallets(client) {
  const roles = [
    'broker',
    'borrower',
    'issuer',
    'credentialIssuer',
    'iouIssuer',
    'iouHolder',
    'xrpDepositor'
  ]
  const wallets = {}
  for (const role of roles) {
    const funded = await test(`fund wallet: ${role}`, () => client.fundWallet(), true)
    wallets[role] = funded.wallet
    rememberSecret(funded.wallet.seed)
  }
  audit.objects.addresses = Object.fromEntries(
    Object.entries(wallets).map(([role, wallet]) => [role, wallet.address])
  )
  return wallets
}
