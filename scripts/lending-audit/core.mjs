import fs from 'node:fs'
import path from 'node:path'
import xrpl from 'xrpl'

export { xrpl }
export const OUT = path.resolve('audit-output')
fs.mkdirSync(OUT, { recursive: true })

export const audit = {
  generated_at: new Date().toISOString(),
  endpoint: null,
  network: {},
  scans: {},
  tests: [],
  txs: [],
  objects: {},
  display: {},
  warnings: []
}

const secrets = new Set()
export const rememberSecret = value => { if (value) secrets.add(value) }
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

export function redacted(value, depth = 0) {
  if (depth > 9 || value == null) return value
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'string' && secrets.has(value)) return '[REDACTED]'
  if (Array.isArray(value)) return value.map(item => redacted(item, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      /seed|secret|private/i.test(key) ? '[REDACTED]' : redacted(item, depth + 1)
    ]))
  }
  return value
}

export const errorShape = error => ({
  name: error?.name,
  message: error?.message ?? String(error),
  data: redacted(error?.data)
})

export async function test(name, fn, required = false) {
  const record = { name, status: 'running', started_at: new Date().toISOString() }
  audit.tests.push(record)
  try {
    const data = await fn()
    Object.assign(record, { status: 'pass', data: redacted(data), finished_at: new Date().toISOString() })
    return data
  } catch (error) {
    Object.assign(record, {
      status: required ? 'critical-fail' : 'fail',
      error: errorShape(error),
      finished_at: new Date().toISOString()
    })
    if (required) throw error
    return null
  }
}

export async function connect() {
  const failures = []
  for (const endpoint of ['wss://s.devnet.rippletest.net:51233', 'wss://devnet.honeycluster.io/']) {
    try {
      const client = new xrpl.Client(endpoint, { connectionTimeout: 15000 })
      await client.connect()
      audit.endpoint = endpoint
      return client
    } catch (error) {
      failures.push({ endpoint, error: errorShape(error) })
    }
  }
  audit.warnings.push({ endpoint_failures: failures })
  throw new Error('No XRPL Lending Devnet endpoint connected')
}

export async function rpc(client, request) {
  return (await client.request(request)).result
}

export function createdId(response, ledgerEntryType) {
  const node = response.result.meta.AffectedNodes.find(item =>
    item.CreatedNode?.LedgerEntryType === ledgerEntryType
  )
  if (!node) throw new Error(`Created ${ledgerEntryType} not found in metadata`)
  return node.CreatedNode.LedgerIndex
}

function affectedSummary(meta) {
  return (meta?.AffectedNodes ?? []).map(node => {
    const kind = Object.keys(node)[0]
    const body = node[kind]
    return {
      kind,
      type: body?.LedgerEntryType,
      index: body?.LedgerIndex,
      previous: redacted(body?.PreviousFields),
      final: redacted(body?.FinalFields),
      created: redacted(body?.NewFields)
    }
  })
}

export async function submit(client, label, transaction, wallet, required = true) {
  return test(label, async () => {
    const response = await client.submitAndWait(transaction, { wallet, autofill: true })
    const result = response.result.meta.TransactionResult
    audit.txs.push({
      label,
      type: transaction.TransactionType,
      request: redacted(transaction),
      result,
      hash: response.result.hash,
      ledger: response.result.ledger_index,
      affected: affectedSummary(response.result.meta)
    })
    if (result !== 'tesSUCCESS') throw new Error(`${label}: ${result}`)
    return response
  }, required)
}

export async function submitLoanSet(client, label, transaction, broker, borrower) {
  return test(label, async () => {
    const filled = await client.autofill(transaction)
    const brokerSigned = broker.sign(filled)
    const fullySigned = xrpl.signLoanSetByCounterparty(borrower, xrpl.decode(brokerSigned.tx_blob))
    const response = await client.submitAndWait(fullySigned.tx)
    const result = response.result.meta.TransactionResult
    audit.txs.push({
      label,
      type: 'LoanSet',
      request: redacted(transaction),
      result,
      hash: response.result.hash,
      ledger: response.result.ledger_index,
      affected: affectedSummary(response.result.meta)
    })
    if (result !== 'tesSUCCESS') throw new Error(`${label}: ${result}`)
    return response
  }, true)
}

export async function entry(client, id) {
  return (await client.request({ command: 'ledger_entry', index: id, ledger_index: 'validated' })).result.node
}

export async function scan(client, type) {
  let marker
  let count = 0
  const samples = []
  do {
    const result = (await client.request({
      command: 'ledger_data',
      ledger_index: 'validated',
      type,
      limit: 100,
      ...(marker ? { marker } : {})
    })).result
    count += result.state.length
    samples.push(...result.state.slice(0, Math.max(0, 3 - samples.length)))
    marker = result.marker
  } while (marker && count < 5000)
  return { type, count, samples: redacted(samples), truncated: count >= 5000 }
}

export const mpt = (id, value) => ({ mpt_issuance_id: id, value: String(value) })
export const rippleIso = value => value == null ? null : new Date((Number(value) + 946684800) * 1000).toISOString()
export const rawRate = value => value == null ? null : `${Number(value) / 1000}%`

export function writeJson(name, value) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(redacted(value), null, 2))
}
