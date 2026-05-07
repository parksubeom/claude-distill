// `claude-distill search <query>` — case-insensitive grep across both files.
// Each match prints the section heading and the surrounding paragraph.

const fs = require('fs');
const cfg = require('./config');

function searchFile(file, label, q) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  // Split into entry sections — every entry header starts with `## `.
  const sections = text.split(/(?=^## )/m);
  const lower = q.toLowerCase();
  let printedHeader = false;
  for (const s of sections) {
    if (!s.trim()) continue;
    if (s.toLowerCase().includes(lower)) {
      if (!printedHeader) {
        console.log('=== ' + label + ' ===');
        printedHeader = true;
      }
      // Highlight matches by wrapping in [[…]]
      console.log(s.replace(new RegExp(q, 'gi'), (m) => '[[' + m + ']]'));
      console.log('---');
    }
  }
}

function run(args) {
  const q = args.join(' ').trim();
  if (!q) {
    console.log('Usage: claude-distill search <query>');
    return;
  }
  searchFile(cfg.GLOBAL_KNOWLEDGE, 'knowledge.md', q);
  searchFile(cfg.GLOBAL_GOTCHAS, 'gotchas.md', q);
}

module.exports = { run };
