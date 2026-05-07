// Resolves the destination markdown file for an entry (global vs project)
// and appends a formatted block. Files are pure markdown so users can edit
// them by hand any time.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

function resolveTarget(entry) {
  const isGotcha = entry.type === 'gotcha';
  if (entry.scope === 'project' && entry.source && entry.source.cwd) {
    const projectClaudeDir = path.join(entry.source.cwd, '.claude');
    fs.mkdirSync(projectClaudeDir, { recursive: true });
    return path.join(projectClaudeDir, isGotcha ? 'gotchas.md' : 'knowledge.md');
  }
  return isGotcha ? cfg.GLOBAL_GOTCHAS : cfg.GLOBAL_KNOWLEDGE;
}

function ensureHeader(file, isGotcha) {
  if (fs.existsSync(file)) return;
  const header = isGotcha
    ? `# Gotchas — incident reports

> Mistakes worth not repeating. Maintained by [claude-distill](https://github.com/parksubeom/claude-distill).

`
    : `# Knowledge — case law

> Judgment calls worth remembering. Maintained by [claude-distill](https://github.com/parksubeom/claude-distill).

`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, header);
}

function formatEntry(e) {
  const title = e.title || '(untitled)';
  const date = (e.source && e.source.timestamp) ? e.source.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const sessionId = (e.source && e.source.sessionId) || 'unknown';
  const project = (e.source && e.source.project) || 'unknown';
  const cmds = (e.source && e.source.relatedCommands && e.source.relatedCommands.length)
    ? ' · cmds: ' + e.source.relatedCommands.join(', ')
    : '';
  const tags = (e.tags || []).map((t) => '`' + t + '`').join(' · ');
  const conf = e.confidence || 'medium';
  const symptomLabel = e.type === 'gotcha' ? 'Symptom' : 'Context';
  const insightLabel = e.type === 'gotcha' ? 'Trap' : 'Insight';

  return [
    `## ${title}`,
    `**Category**: \`${e.category}\`  · **Confidence**: ${conf}  · **Date**: ${date}`,
    `**Source**: session \`${sessionId.slice(0, 8)}\` · project \`${project}\`${cmds}`,
    '',
    `**${symptomLabel}**: ${e.context || ''}`,
    '',
    `**${insightLabel}**: ${e.insight || ''}`,
    '',
    `**Basis**: ${e.basis || ''}`,
    '',
    `**Application**: ${e.application || ''}`,
    '',
    `**Tags**: ${tags}`,
    '',
    '---',
    '',
  ].join('\n');
}

function appendEntry(entry) {
  const file = resolveTarget(entry);
  const isGotcha = entry.type === 'gotcha';
  ensureHeader(file, isGotcha);
  fs.appendFileSync(file, formatEntry(entry));
  return file;
}

module.exports = { resolveTarget, appendEntry, formatEntry };
