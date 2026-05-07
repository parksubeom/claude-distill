// Transcript reader — given a session JSONL, return a compact "relevant
// turns" array suitable for sending to the analyzer. Two strategies:
//
//   1. Find the latest <command-name> marker and take from there to end.
//      (Cleanest signal — that's "what the user asked for".)
//   2. Fallback: take the last N turns (default 30).
//
// Either way we strip large fields (full tool_result content, big diffs)
// to keep the analyzer prompt under a sensible token budget.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const DEFAULT_TAIL_TURNS = 30;
const MAX_TURNS_HARD_CAP = 120;          // Even if a single command marker stretches 800 turns,
                                          // we only send the last 120 to the analyzer.
const MAX_CONTENT_CHARS = 1500;          // per-turn cap (reduced — long tool outputs were dominating)
const MAX_TOOL_RESULT_CHARS = 400;
const COMMAND_RE = /<command-name>\/?([\w.\-:]+)<\/command-name>/;

function listSessionsForCwd(cwd) {
  const slug = cfg.cwdToProjectSlug(cwd);
  const dir = path.join(cfg.PROJECTS_DIR, slug);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dir, f));
}

function listAllSessions() {
  if (!fs.existsSync(cfg.PROJECTS_DIR)) return [];
  const out = [];
  for (const proj of fs.readdirSync(cfg.PROJECTS_DIR)) {
    const projDir = path.join(cfg.PROJECTS_DIR, proj);
    let stat;
    try { stat = fs.statSync(projDir); } catch { continue; }
    if (!stat.isDirectory()) continue;
    let entries;
    try { entries = fs.readdirSync(projDir); } catch { continue; }
    for (const f of entries) if (f.endsWith('.jsonl')) out.push(path.join(projDir, f));
  }
  return out;
}

function latestSessionFile() {
  const all = listAllSessions();
  if (!all.length) return null;
  let best = all[0];
  let bestM = 0;
  for (const f of all) {
    try {
      const m = fs.statSync(f).mtimeMs;
      if (m > bestM) { bestM = m; best = f; }
    } catch {}
  }
  return best;
}

// Read entire jsonl, return parsed lines (skip malformed).
function readLines(file) {
  const txt = fs.readFileSync(file, 'utf8');
  const out = [];
  for (const line of txt.split('\n')) {
    if (!line) continue;
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}

// Trim a turn's content for the analyzer. Keeps the shape but caps long
// strings; keeps tool_use names and tool_result first ~600 chars; drops
// raw images.
function compactTurn(obj) {
  const out = {
    type: obj.type,
    uuid: obj.uuid,
    parentUuid: obj.parentUuid,
    timestamp: obj.timestamp,
  };
  const m = obj.message || {};
  if (typeof m.content === 'string') {
    out.content = m.content.length > MAX_CONTENT_CHARS
      ? m.content.slice(0, MAX_CONTENT_CHARS) + ' …[truncated]'
      : m.content;
  } else if (Array.isArray(m.content)) {
    out.content = m.content.map((c) => {
      if (c.type === 'text') {
        const t = c.text || '';
        return { type: 'text', text: t.length > MAX_CONTENT_CHARS ? t.slice(0, MAX_CONTENT_CHARS) + ' …[truncated]' : t };
      }
      if (c.type === 'tool_use') return { type: 'tool_use', name: c.name, input_keys: Object.keys(c.input || {}) };
      if (c.type === 'tool_result') {
        const txt = typeof c.content === 'string'
          ? c.content
          : (Array.isArray(c.content) ? c.content.filter((x) => x.type === 'text').map((x) => x.text).join('\n') : '');
        return { type: 'tool_result', text_preview: txt.slice(0, MAX_TOOL_RESULT_CHARS) };
      }
      if (c.type === 'image') return { type: 'image', omitted: true };
      return { type: c.type };
    });
  }
  if (m.usage) out.usage = m.usage;
  return out;
}

function extractRelevant(file, opts) {
  const lines = readLines(file);
  if (!lines.length) return { source: file, turns: [], commandMarkers: [] };
  const tailTurns = (opts && opts.tail) || DEFAULT_TAIL_TURNS;
  // Find the last command marker — start from there.
  let startIdx = -1;
  const commandMarkers = [];
  for (let i = 0; i < lines.length; i++) {
    const obj = lines[i];
    if (obj.type === 'user' && obj.message && typeof obj.message.content === 'string') {
      const m = COMMAND_RE.exec(obj.message.content);
      if (m) {
        startIdx = i;
        commandMarkers.push({ index: i, command: m[1], timestamp: obj.timestamp });
      }
    }
  }
  if (startIdx === -1) startIdx = Math.max(0, lines.length - tailTurns);
  // Hard cap — protect the analyzer from a single command marker that
  // stretches across hundreds of turns (long-running session). We keep
  // the most recent ones since they're closest to the lessons learned.
  if (lines.length - startIdx > MAX_TURNS_HARD_CAP) {
    startIdx = lines.length - MAX_TURNS_HARD_CAP;
  }
  const slice = lines.slice(startIdx);
  return {
    source: file,
    turns: slice.map(compactTurn),
    commandMarkers,
    totalLines: lines.length,
    sliceFrom: startIdx,
  };
}

module.exports = {
  listSessionsForCwd,
  listAllSessions,
  latestSessionFile,
  readLines,
  compactTurn,
  extractRelevant,
};
