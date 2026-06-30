import { xrpl, audit, submit, createdId } from './core.mjs'

export async function createPermissioning(client, wallets) {
  const { broker, borrower, issuer, credentialIssuer } = wallets
  const credentialType = xrpl.convertStringToHex('KYC-Verified')
  const response = await submit(client, 'PermissionedDomainSet', {
    TransactionType: 'PermissionedDomainSet',
    Account: credentialIssuer.address,
    AcceptedCredentials: [{
      Credential: {
        Issuer: credentialIssuer.address,
        CredentialType: credentialType
      }
    }]
  }, credentialIssuer)
  const domainID = createdId(response, 'PermissionedDomain')
  audit.objects.domainID = domainID

  for (const [role, wallet] of [
    ['broker', broker],
    ['borrower', borrower],
    ['issuer', issuer]
  ]) {
    await submit(client, `CredentialCreate:${role}`, {
      TransactionType: 'CredentialCreate',
      Account: credentialIssuer.address,
      Subject: wallet.address,
      CredentialType: credentialType
    }, credentialIssuer)
    await submit(client, `CredentialAccept:${role}`, {
      TransactionType: 'CredentialAccept',
      Account: wallet.address,
      Issuer: credentialIssuer.address,
      CredentialType: credentialType
    }, wallet)
  }

  return { domainID, credentialType }
}
