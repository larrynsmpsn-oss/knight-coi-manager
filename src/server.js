import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { createDemoStore } from './lib/demo-store.js';
import { createJsonFileRepository } from './lib/repository.js';
import { createPostgresRepository } from './lib/postgres-repository.js';
import { createSyncPostgresWrapper } from './lib/postgres-sync-wrapper.js';
import { createPool, createDbClient } from './lib/db.js';
import { loadRuntimeConfig } from './lib/runtime-config.js';

// Basic Auth credentials (set via environment variables)
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME || 'admin';
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || 'KnightCOI2026!Secure';
const BASIC_AUTH_ENABLED = process.env.BASIC_AUTH_ENABLED !== 'false';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeConfig = loadRuntimeConfig(process.env);
const workspaceRoot = path.resolve(__dirname, '..');
const PORT = runtimeConfig.port;
const DEMO_STATE_PATH = path.isAbsolute(runtimeConfig.demoStatePath)
  ? runtimeConfig.demoStatePath
  : path.resolve(workspaceRoot, runtimeConfig.demoStatePath);

// Initialize repository (async for Postgres support)
async function initializeRepository() {
  const pgPool = createPool(runtimeConfig.postgres);
  if (pgPool) {
    console.log('Using Postgres repository (DATABASE_URL is set)');
    const dbClient = createDbClient(pgPool);
    const asyncRepo = createPostgresRepository(dbClient);
    return await createSyncPostgresWrapper(asyncRepo);
  } else {
    console.log('Using JSON file repository (no DATABASE_URL)');
    return createJsonFileRepository({ filePath: DEMO_STATE_PATH });
  }
}

const repository = await initializeRepository();
const store = createDemoStore(repository);

// Basic Auth middleware
function basicAuth(req, res) {
  if (!BASIC_AUTH_ENABLED) return true; // Auth disabled
  
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Knight COI Manager"',
      'Content-Type': 'text/plain'
    });
    res.end('Authentication required');
    return false;
  }
  
  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [username, password] = credentials.split(':');
  
  if (username === BASIC_AUTH_USERNAME && password === BASIC_AUTH_PASSWORD) {
    return true; // Authenticated
  }
  
  res.writeHead(401, {
    'WWW-Authenticate': 'Basic realm="Knight COI Manager"',
    'Content-Type': 'text/plain'
  });
  res.end('Invalid credentials');
  return false;
}

function summarizeProcessedItem(item) {
  return {
    messageSubject: item.messageSubject,
    filename: item.filename,
    insuredName: item.insuredName,
    matchedEntity: item.matchedEntityName,
    matchScore: item.matchScore,
    relationship: item.relationship,
    needsReview: item.needsReview,
    reviewReason: item.reviewReason,
    reminders: item.reminderSchedule,
  };
}

function prettifyIssue(issue) {
  return String(issue || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function renderValiditySummary(validity = {}) {
  const blockingIssues = validity.blockingIssues || [];
  const warnings = validity.warnings || [];
  const status = validity.valid ? 'acceptable for MVP' : 'blocked';
  const blockingText = blockingIssues.length
    ? blockingIssues.map(prettifyIssue).join(', ')
    : 'none';
  const warningText = warnings.length
    ? warnings.map(prettifyIssue).join(', ')
    : 'none';

  return {
    status,
    blockingText,
    warningText,
  };
}

function renderSummaryBadges(map = {}) {
  const entries = Object.entries(map || {});
  if (!entries.length) return '<span class="muted">None</span>';
  return entries
    .map(([key, count]) => `<span class="summary-badge"><strong>${count}</strong> ${prettifyIssue(key)}</span>`)
    .join(' ');
}

function renderHtml(payload) {
  const cards = payload.processedAttachments
    .map((item) => {
      const summary = summarizeProcessedItem(item);
      const validity = renderValiditySummary(item.validity);
      return `
      <div class="card ${summary.needsReview ? 'warn' : 'ok'}">
        <h3>${summary.messageSubject}</h3>
        <p><strong>Attachment:</strong> ${summary.filename}</p>
        <p><strong>Insured:</strong> ${summary.insuredName || 'unknown'}</p>
        <p><strong>Match:</strong> ${summary.matchedEntity || 'none'} (${summary.matchScore.toFixed(2)})</p>
        <p><strong>Relationship:</strong> ${summary.relationship}</p>
        <p><strong>Needs review:</strong> ${summary.needsReview ? 'yes' : 'no'}</p>
        ${summary.reviewReason ? `<p><strong>Review reason:</strong> ${prettifyIssue(summary.reviewReason)}</p>` : ''}
        <p><strong>Validity:</strong> ${validity.status}</p>
        <p><strong>Blocking issues:</strong> ${validity.blockingText}</p>
        <p><strong>Warnings:</strong> ${validity.warningText}</p>
        <p><strong>Reminder dates:</strong> ${summary.reminders.map((r) => r.sendOn).join(', ') || 'n/a'}</p>
      </div>
    `;
    })
    .join('');

  const reviewRows = payload.openReviewQueue
    .map((item) => {
      const validity = renderValiditySummary(item.validity);
      const suggestedOptions = payload.entities
        .map((entity) => `<option value="${entity.id}" ${entity.id === item.suggestedEntityId ? 'selected' : ''}>${entity.name}</option>`)
        .join('');

      return `
      <tr>
        <td>${item.priority}</td>
        <td>${prettifyIssue(item.reason)}</td>
        <td>${item.status}</td>
        <td>${item.details.insuredName || 'unknown'}</td>
        <td>${item.details.filename || ''}</td>
        <td>${validity.status}</td>
        <td>${validity.blockingText}</td>
        <td>${validity.warningText}</td>
        <td>
          ${item.status === 'open' ? `
            <div class="action-stack">
              <button class="action-btn" data-action="accept" data-message-id="${item.inboundMessageId}" data-attachment-id="${item.attachmentId}">Accept suggested</button>
              <div class="inline-form">
                <select id="assign-${item.id}">${suggestedOptions}</select>
                <button class="action-btn secondary" data-action="assign" data-message-id="${item.inboundMessageId}" data-attachment-id="${item.attachmentId}" data-select-id="assign-${item.id}">Assign + accept</button>
              </div>
              <button class="action-btn danger" data-action="reject" data-message-id="${item.inboundMessageId}" data-attachment-id="${item.attachmentId}">Reject</button>
            </div>
          ` : `<span class="muted">${item.resolution || 'resolved'}</span>`}
        </td>
      </tr>
    `;
    })
    .join('');

  const resolvedRows = payload.resolvedReviewQueue
    .map((item) => `
      <tr>
        <td>${prettifyIssue(item.reason)}</td>
        <td>${item.details.insuredName || 'unknown'}</td>
        <td>${item.details.filename || ''}</td>
        <td>${prettifyIssue(item.resolution || 'resolved')}</td>
        <td>${item.resolutionNotes || '—'}</td>
      </tr>
    `)
    .join('');

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Knight COI Manager Demo</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; background: #0b1020; color: #e8ecf3; }
        .row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
        .stat, .card, .panel { background: #141b2d; border: 1px solid #26314f; border-radius: 12px; padding: 16px; }
        .stat { min-width: 160px; }
        .card { margin-bottom: 16px; }
        .panel { margin-top: 24px; }
        .ok { border-color: #285943; }
        .warn { border-color: #7a5a13; }
        h1, h2, h3 { margin-top: 0; }
        code, textarea, select, button { font: inherit; }
        code { background: #1b2338; padding: 2px 6px; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px; border-bottom: 1px solid #26314f; vertical-align: top; }
        a { color: #86b7ff; }
        .action-stack { display: grid; gap: 8px; }
        .inline-form { display: flex; gap: 8px; align-items: center; }
        .action-btn { border: 1px solid #35558f; background: #1f3b69; color: #fff; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
        .action-btn.secondary { background: #23314f; border-color: #41527a; }
        .action-btn.danger { background: #5e2332; border-color: #8a3246; }
        .muted { color: #a9b4ca; }
        textarea { width: 100%; min-height: 180px; background: #0f1527; color: #e8ecf3; border: 1px solid #2a3657; border-radius: 10px; padding: 12px; }
        .toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
        .flash { display: none; margin-bottom: 16px; padding: 12px 14px; border-radius: 10px; }
        .flash.show { display: block; }
        .flash.success { background: #173826; border: 1px solid #285943; }
        .flash.error { background: #431b26; border: 1px solid #8a3246; }
        .preview-box { margin-top: 12px; padding: 12px; background: #0f1527; border: 1px solid #2a3657; border-radius: 10px; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .summary-strip { margin-bottom: 12px; display: flex; gap: 8px; flex-wrap: wrap; }
        .summary-badge { display: inline-flex; gap: 6px; align-items: center; background: #10182b; border: 1px solid #2b3c60; border-radius: 999px; padding: 6px 10px; }
      </style>
    </head>
    <body>
      <h1>Knight COI Manager Demo</h1>
      <p><strong>Client:</strong> ${payload.client.name}</p>
      <p>Thin local operator UI on top of the seeded intake, matching, review, reminder, and roster-onboarding APIs.</p>
      <p><strong>📚 Documentation:</strong> <a href="/docs">View User Guides</a> | <a href="/docs/quick-start">Quick Start</a> | <a href="/docs/user-guide">User Guide</a></p>
      <div id="flash" class="flash"></div>
      <div class="toolbar">
        <button class="action-btn secondary" data-action="reset-demo">Reset demo state</button>
        <span class="muted">State path: ${DEMO_STATE_PATH}</span>
      </div>
      <div class="row">
        <div class="stat"><h3>Entities</h3><div>${payload.stats.entities}</div></div>
        <div class="stat"><h3>Certificates</h3><div>${payload.stats.certificates}</div></div>
        <div class="stat"><h3>Messages</h3><div>${payload.stats.messages}</div></div>
        <div class="stat"><h3>Open Review Items</h3><div>${payload.stats.needsReview}</div></div>
        <div class="stat"><h3>Resolved Review Items</h3><div>${payload.stats.resolvedReviewItems}</div></div>
        <div class="stat"><h3>Renewals</h3><div>${payload.stats.renewalsDetected}</div></div>
        <div class="stat"><h3>Validity Blocked</h3><div>${payload.stats.validityBlocked}</div></div>
        <div class="stat"><h3>Validity Warnings</h3><div>${payload.stats.validityWarnings}</div></div>
      </div>
      <h2>Processed Attachments</h2>
      ${cards}
      <div class="panel">
        <h2>Open Review Queue</h2>
        <div class="summary-strip">${renderSummaryBadges(payload.reviewSummary.byPriority)}</div>
        <div class="summary-strip">${renderSummaryBadges(payload.reviewSummary.byReason)}</div>
        <table>
          <thead>
            <tr><th>Priority</th><th>Reason</th><th>Status</th><th>Insured</th><th>Attachment</th><th>Validity</th><th>Blocking</th><th>Warnings</th><th>Actions</th></tr>
          </thead>
          <tbody>
            ${reviewRows || '<tr><td colspan="9">No open review items</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h2>Resolved Review History</h2>
        <p class="muted">Resolved items: ${payload.reviewHistorySummary.total}</p>
        <div class="summary-strip">${renderSummaryBadges(payload.reviewHistorySummary.byResolution)}</div>
        <table>
          <thead>
            <tr><th>Reason</th><th>Insured</th><th>Attachment</th><th>Resolution</th><th>Notes</th></tr>
          </thead>
          <tbody>
            ${resolvedRows || '<tr><td colspan="5">No resolved review items yet</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="panel">
        <h2>Roster Import</h2>
        <p class="muted">Paste CSV content below, then import it into the persisted demo store.</p>
        <textarea id="rosterCsv">name,entity_type,property_code,primary_email,alternate_emails,external_id,notes
Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,"ops@aurorawealth.com;broker@aurorawealth.com",,Existing tenant sample for import testing
River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,,V-100,New vendor sample for import testing</textarea>
        <div class="toolbar">
          <button id="previewRosterBtn" class="action-btn secondary">Preview roster changes</button>
          <button id="importRosterBtn" class="action-btn">Import roster CSV</button>
        </div>
        <div id="rosterPreview" class="preview-box muted">No roster preview yet.</div>
      </div>
      <div class="panel">
        <h2>Demo actions</h2>
        <form method="post" action="/api/demo/reset" style="margin-bottom: 16px;">
          <button type="submit">Reset demo state</button>
        </form>
        <form method="post" action="/api/roster/import">
          <div style="margin-bottom: 8px;"><strong>Import roster CSV</strong></div>
          <div style="margin-bottom: 8px;">
            <label>Default entity type:
              <select name="defaultEntityTypeKey">
                <option value="tenant">tenant</option>
                <option value="vendor">vendor</option>
              </select>
            </label>
          </div>
          <textarea name="csvText" rows="8" style="width: 100%; box-sizing: border-box; background: #0f1527; color: #e8ecf3; border: 1px solid #26314f; border-radius: 8px; padding: 10px;">name,entity_type,property_code,primary_email,external_id
Aurora Wealth Partners,tenant,WESTGATE,certs@aurorawealth.com,
River City Janitorial,vendor,,dispatch@rivercityjanitorial.com,V-100</textarea>
          <div style="margin-top: 8px;">
            <button type="submit">Import roster into demo state</button>
          </div>
        </form>
      </div>
      <div class="panel">
        <h2>Inbox Message Import</h2>
        <p class="muted">Paste either normalized inbox JSON or provider-shaped mailbox JSON below to push new traffic through the intake pipeline.</p>
        <div class="toolbar">
          <label>Import mode:
            <select id="inboxImportMode">
              <option value="normalized">normalized message</option>
              <option value="provider">provider-shaped payload</option>
            </select>
          </label>
          <label>Provider:
            <select id="inboxProvider">
              <option value="gmail">gmail</option>
              <option value="apple-mail">apple-mail</option>
              <option value="exchange">exchange</option>
            </select>
          </label>
        </div>
        <textarea id="inboxJson">{
  "fromEmail": "broker@rivercitycoverage.com",
  "fromName": "River City Coverage",
  "subject": "COI for River City Janitorial",
  "bodyText": "Attached is the updated certificate for River City Janitorial.",
  "attachments": [
    {
      "filename": "RiverCity-COI.pdf",
      "contentType": "application/pdf",
      "text": "CERTIFICATE OF LIABILITY INSURANCE\nINSURED: River City Janitorial\nCERTIFICATE HOLDER: Knight Real Estate\nPOLICY NUMBER: RCJ-101\nEFFECTIVE DATE: 01/01/2026\nEXPIRATION DATE: 12/31/2026"
    }
  ]
}</textarea>
        <div class="toolbar">
          <button id="importInboxBtn" class="action-btn secondary">Import inbox message JSON</button>
        </div>
      </div>
      <div class="panel">
        <h2>JSON endpoints</h2>
        <ul>
          <li><a href="/api/demo">/api/demo</a></li>
          <li><a href="/api/overview">/api/overview</a></li>
          <li><a href="/api/entities">/api/entities</a></li>
          <li><a href="/api/certificates">/api/certificates</a></li>
          <li><a href="/api/review-queue">/api/review-queue</a></li>
          <li><a href="/api/review-history">/api/review-history</a></li>
          <li><a href="/api/inbox">/api/inbox</a></li>
          <li><code>POST /api/review/accept?messageId=...&attachmentId=...</code></li>
          <li><code>POST /api/review/assign?messageId=...&attachmentId=...&entityId=...</code></li>
          <li><code>POST /api/review/reject?messageId=...&attachmentId=...&reason=...</code></li>
          <li><code>POST /api/roster/preview</code> (CSV body or browser form)</li>
          <li><code>POST /api/roster/import</code> (CSV body or browser form)</li>
          <li><code>POST /api/inbox/import</code> (JSON body)</li>
        </ul>
      </div>
      <script>
        const flash = document.getElementById('flash');
        const rosterPreview = document.getElementById('rosterPreview');
        function showFlash(kind, text) {
          flash.className = 'flash show ' + kind;
          flash.textContent = text;
        }

        function renderRosterPreview(result) {
          const lines = [
            'Summary:',
            '  created: ' + result.summary.created,
            '  updated: ' + result.summary.updated,
            '  skipped: ' + result.summary.skipped,
          ];

          if (result.summary.errors?.length) {
            lines.push('', 'Errors:');
            result.summary.errors.forEach((error) => {
              lines.push('  row ' + error.row + ': ' + error.error + (error.value ? ' (' + error.value + ')' : ''));
            });
          }

          if (result.changes?.length) {
            lines.push('', 'Changes:');
            result.changes.forEach((change) => {
              lines.push('  - ' + change.type + ': ' + change.name + ' [' + change.id + ']');
            });
          }

          rosterPreview.textContent = lines.join('\n');
          rosterPreview.classList.remove('muted');
        }

        async function postAction(url, body, contentType) {
          const response = await fetch(url, {
            method: 'POST',
            headers: body ? { 'Content-Type': contentType || 'text/csv' } : {},
            body: body || undefined,
          });
          const payload = await response.json();
          if (!response.ok || payload.error) {
            throw new Error(payload.error || 'Request failed');
          }
          return payload;
        }

        document.querySelectorAll('[data-action]').forEach((button) => {
          button.addEventListener('click', async () => {
            try {
              const action = button.dataset.action;
              if (action === 'reset-demo') {
                await postAction('/api/demo/reset');
                showFlash('success', 'Demo state reset. Reloading...');
                location.reload();
                return;
              }

              const messageId = button.dataset.messageId;
              const attachmentId = button.dataset.attachmentId;
              if (action === 'accept') {
                await postAction('/api/review/accept?messageId=' + encodeURIComponent(messageId) + '&attachmentId=' + encodeURIComponent(attachmentId));
              } else if (action === 'assign') {
                const select = document.getElementById(button.dataset.selectId);
                await postAction('/api/review/assign?messageId=' + encodeURIComponent(messageId) + '&attachmentId=' + encodeURIComponent(attachmentId) + '&entityId=' + encodeURIComponent(select.value));
              } else if (action === 'reject') {
                await postAction('/api/review/reject?messageId=' + encodeURIComponent(messageId) + '&attachmentId=' + encodeURIComponent(attachmentId) + '&reason=rejected_in_demo_ui');
              }
              showFlash('success', 'Action applied. Reloading...');
              location.reload();
            } catch (error) {
              showFlash('error', error.message);
            }
          });
        });

        document.getElementById('previewRosterBtn').addEventListener('click', async () => {
          try {
            const csvText = document.getElementById('rosterCsv').value;
            const result = await postAction('/api/roster/preview', csvText, 'text/csv');
            renderRosterPreview(result);
            showFlash('success', 'Roster preview: ' + result.summary.created + ' create, ' + result.summary.updated + ' update, ' + result.summary.skipped + ' skip.');
          } catch (error) {
            showFlash('error', error.message);
          }
        });

        document.getElementById('importRosterBtn').addEventListener('click', async () => {
          try {
            const csvText = document.getElementById('rosterCsv').value;
            const result = await postAction('/api/roster/import', csvText, 'text/csv');
            showFlash('success', 'Roster import complete: ' + result.summary.created + ' created, ' + result.summary.updated + ' updated, ' + result.summary.skipped + ' skipped. Reloading...');
            location.reload();
          } catch (error) {
            showFlash('error', error.message);
          }
        });

        document.getElementById('importInboxBtn').addEventListener('click', async () => {
          try {
            const inboxJson = document.getElementById('inboxJson').value;
            const mode = document.getElementById('inboxImportMode').value;
            if (mode === 'provider') {
              const provider = document.getElementById('inboxProvider').value;
              const result = await postAction('/api/inbox/import-provider?provider=' + encodeURIComponent(provider), inboxJson, 'application/json');
              showFlash('success', 'Provider message imported as ' + result.message.id + '. Reloading...');
            } else {
              const result = await postAction('/api/inbox/import', inboxJson, 'application/json');
              showFlash('success', 'Inbox message imported as ' + result.message.id + '. Reloading...');
            }
            location.reload();
          } catch (error) {
            showFlash('error', error.message);
          }
        });
      </script>
    </body>
  </html>`;
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function parseFormBody(req, rawBody) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    return null;
  }

  return new URLSearchParams(rawBody);
}

function parseRosterImportBody(req, rawBody) {
  const params = parseFormBody(req, rawBody);
  if (params && (params.has('csvText') || params.has('defaultEntityTypeKey'))) {
    return {
      csvText: params.get('csvText') || '',
      defaultEntityTypeKey: params.get('defaultEntityTypeKey') || 'tenant',
    };
  }

  return {
    csvText: rawBody,
    defaultEntityTypeKey: 'tenant',
  };
}

async function handleAction(req, res, url) {
  const actionPaths = new Set([
    '/api/review/accept',
    '/api/review/assign',
    '/api/review/reject',
    '/api/demo/reset',
    '/api/roster/import',
    '/api/roster/preview',
    '/api/inbox/import',
    '/api/inbox/import-provider',
  ]);

  if (!actionPaths.has(url.pathname)) {
    return false;
  }

  try {
    if (req.method !== 'POST') {
      writeJson(res, 405, { error: 'Method not allowed. Use POST.' });
      return true;
    }

    if (url.pathname === '/api/demo/reset') {
      store.repository.reset();
      writeJson(res, 200, {
        ok: true,
        demoStatePath: DEMO_STATE_PATH,
        snapshot: store.snapshot(),
      });
      return true;
    }

    if (url.pathname === '/api/roster/import' || url.pathname === '/api/roster/preview') {
      const body = await readRequestBody(req);
      const parsed = parseRosterImportBody(req, body);
      const defaultEntityTypeKey = url.searchParams.get('defaultEntityTypeKey') || parsed.defaultEntityTypeKey || 'tenant';
      const result = url.pathname === '/api/roster/preview'
        ? store.previewRoster({ csvText: parsed.csvText, defaultEntityTypeKey })
        : store.importRoster({ csvText: parsed.csvText, defaultEntityTypeKey });
      writeJson(res, 200, result);
      return true;
    }

    if (url.pathname === '/api/inbox/import') {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      writeJson(res, 200, store.importInboxMessage({ message: parsed }));
      return true;
    }

    if (url.pathname === '/api/inbox/import-provider') {
      const body = await readRequestBody(req);
      const parsed = JSON.parse(body || '{}');
      const provider = url.searchParams.get('provider') || parsed.provider || 'unknown';
      writeJson(res, 200, store.importProviderMessage({ provider, message: parsed.message || parsed }));
      return true;
    }

    const rawBody = ['\/api\/review\/accept', '\/api\/review\/assign', '\/api\/review\/reject'].includes(url.pathname)
      ? await readRequestBody(req)
      : '';
    const formParams = parseFormBody(req, rawBody);
    const messageId = url.searchParams.get('messageId') || formParams?.get('messageId') || '';
    const attachmentId = url.searchParams.get('attachmentId') || formParams?.get('attachmentId') || '';

    if (!messageId || !attachmentId) {
      writeJson(res, 400, { error: 'messageId and attachmentId are required.' });
      return true;
    }

    switch (url.pathname) {
      case '/api/review/accept':
        writeJson(res, 200, store.acceptMatched({ messageId, attachmentId }));
        return true;
      case '/api/review/assign': {
        const entityId = url.searchParams.get('entityId') || formParams?.get('entityId') || '';
        if (!entityId) {
          writeJson(res, 400, { error: 'entityId is required for assign.' });
          return true;
        }
        writeJson(res, 200, store.assignEntity({ messageId, attachmentId, entityId }));
        return true;
      }
      case '/api/review/reject': {
        const reason = url.searchParams.get('reason') || formParams?.get('reason') || 'rejected_during_review';
        writeJson(res, 200, store.reject({ messageId, attachmentId, reason }));
        return true;
      }
      default:
        return false;
    }
  } catch (error) {
    writeJson(res, 400, { error: error.message });
    return true;
  }
}

const server = http.createServer(async (req, res) => {
  // Basic Auth check
  if (!basicAuth(req, res)) return;
  
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (await handleAction(req, res, url)) return;

  const payload = store.snapshot();

  switch (url.pathname) {
    case '/api/demo':
      writeJson(res, 200, payload);
      return;
    case '/api/overview':
      writeJson(res, 200, {
        client: payload.client,
        stats: payload.stats,
        reviewSummary: payload.reviewSummary,
      });
      return;
    case '/api/entities':
      writeJson(res, 200, payload.entities);
      return;
    case '/api/certificates':
      writeJson(res, 200, payload.certificates);
      return;
    case '/api/review-queue':
      writeJson(res, 200, {
        items: payload.openReviewQueue,
        summary: payload.reviewSummary,
      });
      return;
    case '/api/review-history':
      writeJson(res, 200, {
        items: payload.resolvedReviewQueue,
        summary: payload.reviewHistorySummary,
      });
      return;
    case '/api/inbox':
      writeJson(res, 200, payload.inbox);
      return;
    case '/docs':
    case '/docs/':
      const indexPath = path.join(__dirname, '../docs/index.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(indexPath, 'utf8'));
      return;
    case '/docs/quick-start':
    case '/docs/quick-start.html':
      const quickStartPath = path.join(__dirname, '../docs/quick-start.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(quickStartPath, 'utf8'));
      return;
    case '/docs/user-guide':
    case '/docs/user-guide.html':
      const userGuidePath = path.join(__dirname, '../docs/user-guide.html');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(userGuidePath, 'utf8'));
      return;
    default:
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderHtml(payload));
  }
});

server.listen(PORT, () => {
  console.log(`Knight COI Manager demo server listening on http://localhost:${PORT}`);
});
