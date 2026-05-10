// Resolves the destination markdown file for an entry (global vs project)
// and appends a formatted block. Files are pure markdown so users can edit
// them by hand any time.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');
const locale = require('./locale');

function resolveTarget(entry) {
  const isGotcha = entry.type === 'gotcha';
  if (entry.scope === 'project' && entry.source && entry.source.cwd) {
    const projectClaudeDir = path.join(entry.source.cwd, '.claude');
    fs.mkdirSync(projectClaudeDir, { recursive: true });
    return path.join(projectClaudeDir, isGotcha ? 'gotchas.md' : 'knowledge.md');
  }
  return isGotcha ? cfg.GLOBAL_GOTCHAS : cfg.GLOBAL_KNOWLEDGE;
}

function ensureHeader(file, isGotcha, lang) {
  if (fs.existsSync(file)) return;
  const L = locale.labels(lang);
  const header = isGotcha ? L.gotchasHeader : L.knowledgeHeader;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, header);
}

function formatEntry(e, lang) {
  const L = locale.labels(lang);
  const title = e.title || L.untitled;
  const date = (e.source && e.source.timestamp) ? e.source.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const sessionId = (e.source && e.source.sessionId) || 'unknown';
  const project = (e.source && e.source.project) || 'unknown';
  const cmds = (e.source && e.source.relatedCommands && e.source.relatedCommands.length)
    ? ' · ' + L.cmdsWord + ': ' + e.source.relatedCommands.join(', ')
    : '';
  const tags = (e.tags || []).map((t) => '`' + t + '`').join(' · ');
  const conf = e.confidence || 'medium';
  const symptomLabel = e.type === 'gotcha' ? L.symptomLabel : L.contextLabel;
  const insightLabel = e.type === 'gotcha' ? L.trapLabel : L.insightLabel;

  return [
    `## ${title}`,
    `**${L.category}**: \`${e.category}\`  · **${L.confidence}**: ${conf}  · **${L.date}**: ${date}`,
    `**${L.source}**: ${L.sessionWord} \`${sessionId.slice(0, 8)}\` · ${L.projectWord} \`${project}\`${cmds}`,
    '',
    `**${symptomLabel}**: ${e.context || ''}`,
    '',
    `**${insightLabel}**: ${e.insight || ''}`,
    '',
    `**${L.basisLabel}**: ${e.basis || ''}`,
    '',
    `**${L.applicationLabel}**: ${e.application || ''}`,
    '',
    `**${L.tagsLabel}**: ${tags}`,
    '',
    '---',
    '',
  ].join('\n');
}

function appendEntry(entry, lang) {
  const file = resolveTarget(entry);
  const isGotcha = entry.type === 'gotcha';
  ensureHeader(file, isGotcha, lang);
  fs.appendFileSync(file, formatEntry(entry, lang));
  return file;
}

module.exports = { resolveTarget, appendEntry, formatEntry };
