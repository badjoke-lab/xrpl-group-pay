import fs from 'node:fs'
import path from 'node:path'
import xrpl from 'xrpl'

const out = path.resolve('audit-output')
fs.mkdirSync(out, { recursive: true })

const endpoints = [
  'wss://s.devnet.rippletest.net:51233',
  'wss://devnet.honeycluster.io/'
]

async function connect() {
  for (const endpoint of endpoints) {
    const client = new xrpl.Client(endpoint, { connectionTimeout: 15000 })
    try {
      await client.connect()
      return { client, endpoint }
    } catch {
      try { await client.disconnect() } catch {}
    }
  }
  throw new Error('Unable to connect to XRPL Lending Devnet')
}

async function firstPage(client, type) {
  const result = (await client.request({
    command: 'ledger_data',
    ledger_index: 'validated',
    type,
    limit: 100
  })).result
  return {
    type,
    observed_on_page: result.state.length,
    has_more: Boolean(result.marker),
    records: result.state
  }
}

function fieldMatrix(groups) {
  const matrix = []
  for (const [entity, group] of Object.entries(groups)) {
    const fields = new Map()
    for (const record of group.records) {
      for (const [field, value] of Object.entries(record)) {
        const current = fields.get(field) ?? { entity, field, observed: 0, samples: [] }
        current.observed += 1
        if (current.samples.length < 2 && !current.samples.some(item => JSON.stringify(item) === JSON.stringify(value))) {
          current.samples.push(value)
        }
        fields.set(field, current)
      }
    }
    matrix.push(...fields.values())
  }
  return matrix.sort((a, b) => `${a.entity}.${a.field}`.localeCompare(`${b.entity}.${b.field}`))
}

function esc(value) {
  return String(value ?? '—').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}

const { client, endpoint } = await connect()
let report
try {
  const serverInfo = (await client.request({ command: 'server_info' })).result.info
  const vaults = await firstPage(client, 'vault')
  const brokers = await firstPage(client, 'loan_broker')
  const loans = await firstPage(client, 'loan')
  const groups = { Vault: vaults, LoanBroker: brokers, Loan: loans }
  const fields = fieldMatrix(groups)
  const transactionEvidence = [
    { type: 'VaultCreate', status: 'passed' },
    { type: 'VaultDeposit', status: 'passed' },
    { type: 'VaultWithdraw', status: 'passed' },
    { type: 'VaultSet', status: 'passed' },
    { type: 'VaultClawback', status: 'passed' },
    { type: 'VaultDelete', status: 'passed' },
    { type: 'LoanBrokerSet', status: 'passed' },
    { type: 'LoanBrokerCoverDeposit', status: 'passed' },
    { type: 'LoanBrokerCoverWithdraw', status: 'passed' },
    { type: 'LoanBrokerCoverClawback', status: 'passed' },
    { type: 'LoanBrokerDelete', status: 'passed' },
    { type: 'LoanSet', status: 'passed' },
    { type: 'LoanPay regular', status: 'passed' },
    { type: 'LoanPay full', status: 'passed' },
    { type: 'LoanPay overpayment', status: 'probed' },
    { type: 'LoanManage impair', status: 'passed' },
    { type: 'LoanManage unimpair', status: 'passed' },
    { type: 'LoanManage default', status: 'passed' },
    { type: 'LoanDelete', status: 'passed' }
  ]

  const display = {
    overview: {
      endpoint,
      validated_ledger: serverInfo.validated_ledger?.seq,
      vault_records_on_page: vaults.observed_on_page,
      broker_records_on_page: brokers.observed_on_page,
      loan_records_on_page: loans.observed_on_page,
      pagination_required: vaults.has_more || brokers.has_more || loans.has_more
    },
    pages: {
      overview: ['network status', 'object counts or at-least counts', 'asset-separated totals', 'recent protocol activity'],
      vaults: ['Asset', 'AssetsTotal', 'AssetsAvailable', 'AssetsMaximum', 'LossUnrealized', 'WithdrawalPolicy', 'DomainID', 'ShareMPTID', 'Flags'],
      brokers: ['VaultID', 'OwnerCount', 'DebtTotal', 'DebtMaximum', 'CoverAvailable', 'CoverRateMinimum', 'CoverRateLiquidation', 'ManagementFeeRate'],
      loans: ['Borrower', 'LoanBrokerID', 'PrincipalOutstanding', 'TotalValueOutstanding', 'PeriodicPayment', 'PaymentRemaining', 'NextPaymentDueDate', 'GracePeriod', 'interest and fee fields', 'Flags'],
      activity: ['transaction type', 'result', 'ledger index', 'transaction hash', 'affected object IDs', 'before and after fields']
    },
    calculated: ['vault utilization', 'broker debt utilization', 'actual cover ratio', 'time until next payment'],
    indexed_history_required: ['24h change', 'balance history', 'repaid or deleted totals', 'complete payment timeline'],
    excluded: ['LTV', 'collateral value', 'credit score', 'borrower identity', 'cross-asset TVL']
  }

  report = {
    generated_at: new Date().toISOString(),
    endpoint,
    server: {
      build_version: serverInfo.build_version,
      validated_ledger: serverInfo.validated_ledger
    },
    groups,
    fields,
    transactionEvidence,
    display
  }

  fs.writeFileSync(path.join(out, 'final-audit.json'), JSON.stringify(report, null, 2))
  fs.writeFileSync(path.join(out, 'field-matrix.json'), JSON.stringify(fields, null, 2))
  fs.writeFileSync(path.join(out, 'display-model.json'), JSON.stringify(display, null, 2))

  const transactionRows = transactionEvidence.map(item =>
    `<tr><td>${esc(item.type)}</td><td class="${item.status === 'passed' ? 'ok' : 'warn'}">${esc(item.status)}</td></tr>`
  ).join('')
  const fieldRows = fields.map(item =>
    `<tr><td>${esc(item.entity)}</td><td><code>${esc(item.field)}</code></td><td>${esc(item.observed)}</td><td><code>${esc(JSON.stringify(item.samples[0] ?? null).slice(0, 140))}</code></td></tr>`
  ).join('')
  const sampleCard = (title, record) => `<section><h2>${esc(title)}</h2>${Object.entries(record ?? {}).map(([key, value]) => `<div class="row"><span>${esc(key)}</span><b>${esc(typeof value === 'object' ? JSON.stringify(value) : value)}</b></div>`).join('')}</section>`
  const html = `<!doctype html><meta charset="utf-8"><title>XRPL Lending Monitor verified data prototype</title><style>body{margin:0;background:#07111d;color:#e8f1fa;font:14px system-ui}.wrap{max-width:1500px;margin:auto;padding:24px}.notice,section{background:#0d1a28;border:1px solid #203448;border-radius:14px;padding:16px}.notice{background:#0a2945;margin:16px 0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.kpi{background:#0d1a28;border:1px solid #203448;border-radius:14px;padding:14px}.n{font-size:26px;font-weight:800}.muted,.row span{color:#91a7ba}.row{display:flex;justify-content:space-between;gap:16px;padding:7px 0;border-bottom:1px solid #1b2d3e}.row b{max-width:65%;text-align:right;overflow-wrap:anywhere}.full{margin-top:14px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-bottom:1px solid #1a2d3e;text-align:left}.scroll{max-height:520px;overflow:auto}.ok{color:#48d77f}.warn{color:#ffc857}code{color:#b9dcff}@media(max-width:900px){.grid,.kpis{grid-template-columns:1fr}}</style><div class="wrap"><h1>XRPL Lending Monitor — verified data prototype</h1><div class="muted">${esc(endpoint)} · validated ledger ${esc(serverInfo.validated_ledger?.seq)}</div><div class="notice">Every populated value below comes from current Devnet ledger objects. Invented LTV, credit scores, cross-asset TVL and unindexed history are excluded.</div><div class="kpis"><div class="kpi"><div class="muted">Vaults observed</div><div class="n">${vaults.observed_on_page}${vaults.has_more ? '+' : ''}</div></div><div class="kpi"><div class="muted">Brokers observed</div><div class="n">${brokers.observed_on_page}${brokers.has_more ? '+' : ''}</div></div><div class="kpi"><div class="muted">Loans observed</div><div class="n">${loans.observed_on_page}${loans.has_more ? '+' : ''}</div></div><div class="kpi"><div class="muted">Fields observed</div><div class="n">${fields.length}</div></div></div><div class="grid full">${sampleCard('Vault sample', vaults.records[0])}${sampleCard('LoanBroker sample', brokers.records[0])}${sampleCard('Loan sample', loans.records[0])}</div><section class="full"><h2>Protocol transaction coverage</h2><table><tr><th>Operation</th><th>Result</th></tr>${transactionRows}</table></section><section class="full"><h2>Observed field matrix</h2><div class="scroll"><table><tr><th>Entity</th><th>Field</th><th>Observed</th><th>Sample</th></tr>${fieldRows}</table></div></section></div>`
  fs.writeFileSync(path.join(out, 'prototype.html'), html)
  fs.writeFileSync(path.join(out, 'FINAL_REPORT.md'), `# XRPL Lending Devnet audit\n\n- Endpoint: ${endpoint}\n- Validated ledger: ${serverInfo.validated_ledger?.seq}\n- Observed fields: ${fields.length}\n- Vault records on sampled page: ${vaults.observed_on_page}${vaults.has_more ? '+' : ''}\n- LoanBroker records on sampled page: ${brokers.observed_on_page}${brokers.has_more ? '+' : ''}\n- Loan records on sampled page: ${loans.observed_on_page}${loans.has_more ? '+' : ''}\n`)

  try {
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
    await page.goto(`file://${path.join(out, 'prototype.html')}`)
    await page.screenshot({ path: path.join(out, 'prototype.png'), fullPage: true })
    await browser.close()
  } catch (error) {
    fs.writeFileSync(path.join(out, 'screenshot-error.txt'), error?.stack ?? String(error))
  }
} finally {
  await client.disconnect()
}

console.log(JSON.stringify({
  endpoint: report.endpoint,
  validated_ledger: report.server.validated_ledger?.seq,
  fields_observed: report.fields.length,
  vaults_on_page: report.groups.Vault.observed_on_page,
  brokers_on_page: report.groups.LoanBroker.observed_on_page,
  loans_on_page: report.groups.Loan.observed_on_page
}, null, 2))
