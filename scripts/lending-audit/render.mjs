import fs from 'node:fs'
import path from 'node:path'
import {
  OUT,
  audit,
  redacted,
  writeJson,
  rippleIso,
  rawRate
} from './core.mjs'

const directFields = {
  Vault: [
    'LedgerEntryType', 'Flags', 'Account', 'Owner', 'Asset', 'AssetsTotal',
    'AssetsAvailable', 'AssetsMaximum', 'LossUnrealized', 'ShareMPTID',
    'WithdrawalPolicy', 'Scale', 'Data', 'DomainID', 'PreviousTxnID',
    'PreviousTxnLgrSeq', 'index'
  ],
  LoanBroker: [
    'LedgerEntryType', 'Flags', 'Account', 'Owner', 'VaultID', 'OwnerCount',
    'DebtTotal', 'DebtMaximum', 'CoverAvailable', 'CoverRateMinimum',
    'CoverRateLiquidation', 'ManagementFeeRate', 'LoanSequence', 'Data',
    'PreviousTxnID', 'PreviousTxnLgrSeq', 'index'
  ],
  Loan: [
    'LedgerEntryType', 'Flags', 'LoanBrokerID', 'Borrower', 'InterestRate',
    'LateInterestRate', 'CloseInterestRate', 'OverpaymentInterestRate',
    'LoanOriginationFee', 'LoanServiceFee', 'LatePaymentFee',
    'ClosePaymentFee', 'OverpaymentFee', 'StartDate', 'PaymentInterval',
    'GracePeriod', 'PreviousPaymentDueDate', 'NextPaymentDueDate',
    'PaymentRemaining', 'PrincipalOutstanding', 'TotalValueOutstanding',
    'ManagementFeeOutstanding', 'PeriodicPayment', 'LoanScale', 'Data',
    'PreviousTxnID', 'PreviousTxnLgrSeq', 'index'
  ]
}

function collect(object, entity, source, matrix) {
  if (!object || typeof object !== 'object') return
  for (const [field, value] of Object.entries(object)) {
    const key = `${entity}.${field}`
    matrix[key] ??= { entity, field, observed: 0, sources: [], samples: [] }
    const record = matrix[key]
    record.observed += 1
    if (!record.sources.includes(source)) record.sources.push(source)
    const sample = redacted(value)
    if (record.samples.length < 2 && !record.samples.some(item => JSON.stringify(item) === JSON.stringify(sample))) {
      record.samples.push(sample)
    }
  }
}

function number(value) { return Number(value ?? 0) }
function percentage(value, maximum) {
  return maximum ? `${(100 * value / maximum).toFixed(2)}%` : '—'
}
function escape(value) {
  return String(value ?? '—').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
}

export async function renderAudit() {
  const matrix = {}
  for (const [source, object] of Object.entries(audit.objects)) {
    if (/vault/i.test(source)) collect(object?.node ?? object, 'Vault', source, matrix)
    if (/broker_(created|updated|final)/.test(source)) collect(object, 'LoanBroker', source, matrix)
    if (/loan_(created|impaired|unimpaired|after|defaulted)/.test(source)) collect(object, 'Loan', source, matrix)
    if (source === 'configured_loan_created') collect(object, 'Loan', source, matrix)
  }
  for (const transaction of audit.txs) {
    collect(transaction.request, `Transaction:${transaction.type}`, transaction.label, matrix)
  }

  const fieldMatrix = Object.values(matrix).map(record => ({
    ...record,
    display: record.entity.startsWith('Transaction:')
      ? 'history/event source'
      : directFields[record.entity]?.includes(record.field)
        ? 'direct current-state field'
        : 'observed extra; inspect before UI use'
  })).sort((a, b) => `${a.entity}.${a.field}`.localeCompare(`${b.entity}.${b.field}`))

  const vault = audit.objects.vault_final ?? audit.objects.vault_deposited ?? {}
  const broker = audit.objects.broker_final ?? audit.objects.broker_updated ?? audit.objects.broker_created ?? {}
  const loan = audit.objects.configured_loan_after_regular ?? audit.objects.configured_loan_unimpaired ?? audit.objects.configured_loan_created ?? {}

  const display = {
    overview: {
      validated_ledger: audit.network.server_info?.info?.validated_ledger?.seq,
      current_counts: {
        vault: audit.scans.after?.vault?.count,
        loan_broker: audit.scans.after?.loan_broker?.count,
        loan: audit.scans.after?.loan?.count
      },
      rules: [
        'Count current ledger objects only.',
        'Calculate status counts from observed Loan.Flags.',
        'Never add XRP, IOU and MPT quantities into one TVL without a price source.'
      ]
    },
    vault: {
      id: audit.objects.vaultID,
      asset: vault.Asset,
      total: vault.AssetsTotal,
      available: vault.AssetsAvailable,
      maximum: vault.AssetsMaximum,
      unrealized_loss: vault.LossUnrealized,
      utilization: percentage(number(vault.AssetsTotal) - number(vault.AssetsAvailable), number(vault.AssetsTotal)),
      flags: vault.Flags,
      share_id: vault.ShareMPTID,
      withdrawal_policy: vault.WithdrawalPolicy,
      scale: vault.Scale,
      source: 'ledger_entry and vault_info'
    },
    broker: {
      id: audit.objects.loanBrokerID,
      vault_id: broker.VaultID,
      active_loans: broker.OwnerCount,
      debt: broker.DebtTotal,
      debt_maximum: broker.DebtMaximum,
      debt_utilization: percentage(number(broker.DebtTotal), number(broker.DebtMaximum)),
      cover: broker.CoverAvailable,
      actual_cover_ratio: percentage(number(broker.CoverAvailable), number(broker.DebtTotal)),
      configured_cover_minimum: broker.CoverRateMinimum,
      configured_cover_liquidation: broker.CoverRateLiquidation,
      management_fee: rawRate(broker.ManagementFeeRate),
      source: 'ledger_entry'
    },
    loan: {
      id: audit.objects.configuredLoanID,
      borrower: loan.Borrower,
      broker_id: loan.LoanBrokerID,
      flags: loan.Flags,
      principal_outstanding: loan.PrincipalOutstanding,
      total_outstanding: loan.TotalValueOutstanding,
      periodic_payment: loan.PeriodicPayment,
      remaining_payments: loan.PaymentRemaining,
      interest: rawRate(loan.InterestRate),
      late_interest: rawRate(loan.LateInterestRate),
      next_due: rippleIso(loan.NextPaymentDueDate),
      grace_seconds: loan.GracePeriod,
      source: 'ledger_entry; original terms and timeline also use LoanSet/account_tx metadata'
    },
    activity: {
      source: 'validated transaction result plus AffectedNodes',
      tested_types: [...new Set(audit.txs.map(item => item.type))]
    },
    excluded_until_an_indexer_or_external_source_exists: [
      '24-hour change',
      'historical balance chart',
      'repaid or deleted historical totals',
      'LTV or collateral value',
      'credit or risk score',
      'borrower identity',
      'cross-asset TVL'
    ]
  }
  audit.display = display

  const summary = {
    endpoint: audit.endpoint,
    passed: audit.tests.filter(item => item.status === 'pass').length,
    failed: audit.tests.filter(item => item.status === 'fail').length,
    critical: audit.tests.filter(item => item.status === 'critical-fail').length,
    transactions_successful: audit.txs.filter(item => item.result === 'tesSUCCESS').length,
    transactions_failed: audit.txs.filter(item => item.result !== 'tesSUCCESS').length,
    fields_observed: fieldMatrix.length
  }

  const fieldRows = fieldMatrix
    .filter(item => ['Vault', 'LoanBroker', 'Loan'].includes(item.entity))
    .map(item => `<tr><td>${escape(item.entity)}</td><td><code>${escape(item.field)}</code></td><td>${escape(item.display)}</td><td><code>${escape(JSON.stringify(item.samples[0] ?? null).slice(0, 120))}</code></td></tr>`)
    .join('')
  const transactionRows = audit.txs
    .map(item => `<tr><td>${escape(item.label)}</td><td>${escape(item.type)}</td><td class="${item.result === 'tesSUCCESS' ? 'ok' : 'bad'}">${escape(item.result)}</td><td>${escape(item.ledger)}</td></tr>`)
    .join('')
  const cardRows = object => Object.entries(object)
    .map(([key, value]) => `<div class="row"><span>${escape(key)}</span><b>${escape(typeof value === 'object' ? JSON.stringify(value) : value)}</b></div>`)
    .join('')

  const html = `<!doctype html><meta charset="utf-8"><title>XRPL Lending Live Audit</title><style>
body{margin:0;background:#07111d;color:#e8f1fa;font:14px system-ui}.wrap{max-width:1450px;margin:auto;padding:24px}.top{display:flex;justify-content:space-between;align-items:center}.notice,.card{background:#0d1a28;border:1px solid #203448;border-radius:14px;padding:16px}.notice{margin:16px 0;background:#0a2945}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}.kpi{grid-column:span 2}.third{grid-column:span 4}.full{grid-column:1/-1}.number{font-size:25px;font-weight:800}.muted,.row span{color:#91a7ba}.row{display:flex;justify-content:space-between;gap:20px;padding:7px 0;border-bottom:1px solid #1b2d3e}.row b{max-width:65%;text-align:right;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:8px;border-bottom:1px solid #1a2d3e;text-align:left}.scroll{max-height:520px;overflow:auto}.ok{color:#48d77f}.bad{color:#ff6671}code{color:#b9dcff}@media(max-width:900px){.kpi,.third{grid-column:1/-1}}
</style><div class="wrap"><div class="top"><div><h1>XRPL Lending Monitor — verified prototype</h1><div class="muted">actual Devnet responses and test-generated objects</div></div><div>${escape(audit.endpoint)}</div></div><div class="notice">Only tested values are populated. The interface deliberately omits invented risk scores, LTV, cross-asset TVL and unindexed historical charts.</div><div class="grid"><div class="card kpi"><div class="muted">Tests passed</div><div class="number">${summary.passed}</div><div>${summary.failed} failed</div></div><div class="card kpi"><div class="muted">Transactions</div><div class="number">${summary.transactions_successful}</div><div>${summary.transactions_failed} failed</div></div><div class="card kpi"><div class="muted">Observed fields</div><div class="number">${summary.fields_observed}</div></div><div class="card kpi"><div class="muted">Vaults now</div><div class="number">${escape(display.overview.current_counts.vault)}</div></div><div class="card kpi"><div class="muted">Brokers now</div><div class="number">${escape(display.overview.current_counts.loan_broker)}</div></div><div class="card kpi"><div class="muted">Loans now</div><div class="number">${escape(display.overview.current_counts.loan)}</div></div><div class="card third"><h2>Vault</h2>${cardRows(display.vault)}</div><div class="card third"><h2>LoanBroker</h2>${cardRows(display.broker)}</div><div class="card third"><h2>Loan</h2>${cardRows(display.loan)}</div><div class="card full"><h2>Lifecycle transactions</h2><div class="scroll"><table><tr><th>Test</th><th>Type</th><th>Result</th><th>Ledger</th></tr>${transactionRows}</table></div></div><div class="card full"><h2>Observed field to UI support</h2><div class="scroll"><table><tr><th>Entity</th><th>Field</th><th>Rule</th><th>Sample</th></tr>${fieldRows}</table></div></div></div></div>`

  writeJson('raw-audit.json', audit)
  writeJson('field-matrix.json', fieldMatrix)
  writeJson('display-model.json', display)
  fs.writeFileSync(path.join(OUT, 'prototype.html'), html)
  fs.writeFileSync(path.join(OUT, 'AUDIT_REPORT.md'), `# XRPL Lending Devnet live audit\n\nGenerated: ${audit.generated_at}\n\nEndpoint: ${audit.endpoint}\n\n- Tests: ${summary.passed} passed / ${summary.failed} failed / ${summary.critical} critical\n- Transactions: ${summary.transactions_successful} successful / ${summary.transactions_failed} failed\n- Fields observed: ${summary.fields_observed}\n`)

  try {
    const { chromium } = await import('@playwright/test')
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
    await page.goto(`file://${path.join(OUT, 'prototype.html')}`)
    await page.screenshot({ path: path.join(OUT, 'prototype.png'), fullPage: true })
    await browser.close()
  } catch (error) {
    audit.warnings.push({ screenshot: { message: error?.message ?? String(error) } })
    writeJson('raw-audit.json', audit)
  }

  console.log('XRPL_LENDING_AUDIT_RESULT_BEGIN')
  console.log(JSON.stringify({
    summary,
    display,
    failed_tests: audit.tests.filter(item => item.status !== 'pass').map(item => ({
      name: item.name,
      status: item.status,
      error: item.error
    })),
    transaction_types: [...new Set(audit.txs.map(item => item.type))]
  }, null, 2))
  console.log('XRPL_LENDING_AUDIT_RESULT_END')
  return summary
}
