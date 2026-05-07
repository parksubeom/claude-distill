// `claude-distill review`
//
// Walks pending candidates one at a time. Single-key prompt:
//   a — accept (append to knowledge.md / gotchas.md)
//   e — edit  (open $EDITOR on a temp markdown buffer first)
//   r — reject (drop)
//   s — skip-for-later (keep in pending)
//   p — toggle scope (project ↔ global)
//   q — quit
//
// Pending entries are kept in ~/.claude/.distill/pending.json. Approved
// entries are removed from pending and appended to the right file.

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execSync } = require('child_process');
const cfg = require('./config');
const store = require('./store');

function readPending() {
  if (!fs.existsSync(cfg.PENDING_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(cfg.PENDING_FILE, 'utf8')); } catch { return []; }
}
function writePending(arr) {
  cfg.ensureStateDir();
  fs.writeFileSync(cfg.PENDING_FILE, JSON.stringify(arr, null, 2) + '\n');
}

function box(lines, width) {
  const w = width || 70;
  const top = '┌' + '─'.repeat(w - 2) + '┐';
  const bot = '└' + '─'.repeat(w - 2) + '┘';
  const middle = lines.map((l) => {
    const t = String(l);
    if (t.length > w - 4) return '│ ' + t.slice(0, w - 7) + '... │';
    return '│ ' + t + ' '.repeat(w - 4 - t.length) + ' │';
  });
  return [top, ...middle, bot].join('\n');
}

function summary(entry, idx, total) {
  const icon = entry.type === 'gotcha' ? '⚠️ ' : '🧠 ';
  const head = `[${idx + 1}/${total}] ${icon}${entry.type.toUpperCase()} · ${entry.category} · confidence: ${entry.confidence || '?'}`;
  const lines = [
    `Title:  ${entry.title || ''}`,
    '',
    `Context:    ${entry.context || ''}`,
    `Insight:    ${entry.insight || ''}`,
    `Basis:      ${entry.basis || ''}`,
    `Apply:      ${entry.application || ''}`,
    '',
    `Tags:   ${(entry.tags || []).join(' · ')}`,
    `Scope:  ${entry.scope === 'project' ? '◉ Project   ○ Global' : '○ Project   ◉ Global'}`,
  ];
  return head + '\n' + box(lines, 78);
}

function editEntry(entry) {
  const editor = process.env.EDITOR || 'nano';
  const tmp = path.join(os.tmpdir(), `claude-distill-${entry.id}.md`);
  const body = [
    `# ${entry.title}`,
    '',
    '<!-- Edit any field below. Save and close to continue. -->',
    '',
    `Type: ${entry.type}`,
    `Category: ${entry.category}`,
    `Confidence: ${entry.confidence || 'medium'}`,
    `Scope: ${entry.scope || 'global'}`,
    `Tags: ${(entry.tags || []).join(', ')}`,
    '',
    '## Context',
    entry.context || '',
    '',
    '## Insight',
    entry.insight || '',
    '',
    '## Basis',
    entry.basis || '',
    '',
    '## Application',
    entry.application || '',
    '',
  ].join('\n');
  fs.writeFileSync(tmp, body);
  execSync(`${editor} "${tmp}"`, { stdio: 'inherit' });
  const edited = fs.readFileSync(tmp, 'utf8');
  fs.unlinkSync(tmp);
  return parseEditedBuffer(edited, entry);
}

function parseEditedBuffer(text, base) {
  const out = { ...base };
  const titleMatch = text.match(/^# (.+)$/m);
  if (titleMatch) out.title = titleMatch[1].trim();
  const fieldRe = (k) => new RegExp('^' + k + ':\\s*(.+)$', 'm');
  const t = (k) => { const m = text.match(fieldRe(k)); return m ? m[1].trim() : null; };
  const type = t('Type'); if (type) out.type = type;
  const cat = t('Category'); if (cat) out.category = cat;
  const conf = t('Confidence'); if (conf) out.confidence = conf;
  const scope = t('Scope'); if (scope) out.scope = scope;
  const tags = t('Tags'); if (tags) out.tags = tags.split(',').map((s) => s.trim()).filter(Boolean);
  const section = (name) => {
    const re = new RegExp('## ' + name + '\\s*\\n([\\s\\S]*?)(?=\\n## |$)', 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  const ctx = section('Context'); if (ctx !== null) out.context = ctx;
  const ins = section('Insight'); if (ins !== null) out.insight = ins;
  const basis = section('Basis'); if (basis !== null) out.basis = basis;
  const app = section('Application'); if (app !== null) out.application = app;
  return out;
}

function readKey(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (ans) => resolve(ans.trim().toLowerCase()));
  });
}

async function run(args) {
  const all = readPending();
  if (!all.length) {
    console.log('Nothing pending. Run `claude-distill analyze` after a session.');
    return;
  }
  console.log(`🧠 Distill — ${all.length} pending candidate(s)\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const remaining = [];
  let approved = 0, rejected = 0, skipped = 0;

  for (let i = 0; i < all.length; i++) {
    let entry = all[i];
    if (!entry.scope) entry.scope = 'global';
    let done = false;
    while (!done) {
      console.log('');
      console.log(summary(entry, i, all.length));
      const ans = await readKey(rl, '\n[a]ccept  [e]dit  [r]eject  [s]kip  [p]roject/global  [q]uit  > ');
      if (ans === 'a' || ans === 'accept') {
        const dest = store.appendEntry(entry);
        console.log('✓ Appended to ' + dest);
        approved++;
        done = true;
      } else if (ans === 'e' || ans === 'edit') {
        try { entry = editEntry(entry); } catch (err) { console.log('  edit failed: ' + err.message); }
      } else if (ans === 'r' || ans === 'reject') {
        rejected++;
        done = true;
      } else if (ans === 's' || ans === 'skip') {
        remaining.push(entry);
        skipped++;
        done = true;
      } else if (ans === 'p' || ans === 'project') {
        entry.scope = entry.scope === 'project' ? 'global' : 'project';
        console.log('  scope → ' + entry.scope);
      } else if (ans === 'q' || ans === 'quit') {
        // Push current and the rest back to pending
        remaining.push(entry, ...all.slice(i + 1));
        rl.close();
        writePending(remaining);
        console.log(`\n${approved} approved · ${rejected} rejected · ${skipped + (all.length - i - 1)} skipped`);
        return;
      } else {
        console.log('  unknown choice. a/e/r/s/p/q.');
      }
    }
  }
  rl.close();
  writePending(remaining);
  console.log(`\n${approved} approved · ${rejected} rejected · ${skipped} skipped`);
}

module.exports = { run };
