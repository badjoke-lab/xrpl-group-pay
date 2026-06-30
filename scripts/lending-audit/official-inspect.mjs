import fs from 'node:fs'
import { audit, test, entry } from './core.mjs'

export async function inspectOfficialSampleObjects(client) {
  const path = 'audit-output/official-lending-ids.json'
  if (!fs.existsSync(path)) return
  const ids = JSON.parse(fs.readFileSync(path, 'utf8'))
  audit.objects.official_sample_ids = ids
  audit.objects.official_vault_after_samples = await test(
    'inspect official sample Vault',
    () => entry(client, ids.vaultID),
    true
  )
  audit.objects.official_broker_after_cover_samples = await test(
    'inspect official sample LoanBroker after cover operations',
    () => entry(client, ids.loanBrokerID),
    true
  )
  audit.objects.official_defaulted_loan = await test(
    'inspect official sample defaulted Loan',
    () => entry(client, ids.loanID1),
    true
  )
  audit.objects.official_deleted_loan_probe = await test(
    'verify official sample paid loan deletion',
    async () => {
      try {
        const node = await entry(client, ids.loanID2)
        return { deleted: false, node }
      } catch (error) {
        return { deleted: true, error: error?.message ?? String(error) }
      }
    },
    true
  )
}
