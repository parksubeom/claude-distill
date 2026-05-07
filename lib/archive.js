// `claude-distill archive [--older=90d]`
//
// Manual / scheduled cleanup. We can't easily detect "unused" entries
// without reference tracking, so today we just timestamp-rotate: any
// entry whose Date line is older than --older gets moved to archive/.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

function parseDays(s) {
  const m = String(s).match(/^(\d+)d$/);
  if (m) return parseInt(m[1], 10);
  return 90;
}

function splitEntries(text) {
  // Each entry starts with `## `. Return [{ block, dateMs }].
  const sections = text.split(/(?=^## )/m).filter((s) => s.trim().startsWith('## '));
  return sections.map((s) => {
    const m = s.match(/Date:\s*(\d{4}-\d{2}-\d{2})/);
    let dateMs = 0;
    if (m) dateMs = new Date(m[1] + 'T00:00:00Z').getTime();
    return { block: s, dateMs };
  });
}

function preamble(text) {
  const idx = text.search(/^## /m);
  return idx === -1 ? text : text.slice(0, idx);
}

function rotate(file, archiveFile, cutoffMs) {
  if (!fs.existsSync(file)) return { archived: 0, kept: 0 };
  const text = fs.readFileSync(file, 'utf8');
  const head = preamble(text);
  const entries = splitEntries(text);
  const kept = [];
  const archived = [];
  for (const e of entries) {
    if (e.dateMs && e.dateMs < cutoffMs) archived.push(e.block);
    else kept.push(e.block);
  }
  fs.writeFileSync(file, head + kept.join(''));
  if (archived.length) {
    cfg.ensureStateDir();
    fs.appendFileSync(archiveFile, '\n' + archived.join(''));
  }
  return { archived: archived.length, kept: kept.length };
}

function run(args) {
  let older = '90d';
  for (const a of args) if (a.startsWith('--older=')) older = a.slice('--older='.length);
  const days = parseDays(older);
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;

  const k = rotate(cfg.GLOBAL_KNOWLEDGE, path.join(cfg.ARCHIVE_DIR, 'knowledge-archive.md'), cutoffMs);
  const g = rotate(cfg.GLOBAL_GOTCHAS,   path.join(cfg.ARCHIVE_DIR, 'gotchas-archive.md'),   cutoffMs);
  console.log(`knowledge: archived ${k.archived}, kept ${k.kept}`);
  console.log(`gotchas:   archived ${g.archived}, kept ${g.kept}`);
}

module.exports = { run };
