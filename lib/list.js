// `claude-distill list [--type=knowledge|gotcha]`
//
// Just cats the global files. Project-scoped lookups not yet covered —
// run with --cwd or open <project>/.claude/{knowledge,gotchas}.md
// directly.

const fs = require('fs');
const cfg = require('./config');

function run(args) {
  let type = 'all';
  for (const a of args) {
    if (a.startsWith('--type=')) type = a.slice('--type='.length);
  }
  if (type === 'all' || type === 'knowledge') {
    console.log('=== knowledge.md (global) ===');
    if (fs.existsSync(cfg.GLOBAL_KNOWLEDGE)) console.log(fs.readFileSync(cfg.GLOBAL_KNOWLEDGE, 'utf8'));
    else console.log('(empty)');
    console.log('');
  }
  if (type === 'all' || type === 'gotcha' || type === 'gotchas') {
    console.log('=== gotchas.md (global) ===');
    if (fs.existsSync(cfg.GLOBAL_GOTCHAS)) console.log(fs.readFileSync(cfg.GLOBAL_GOTCHAS, 'utf8'));
    else console.log('(empty)');
  }
}

module.exports = { run };
