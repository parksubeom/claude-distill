// `claude-distill where` — 모든 path / 존재 여부 한 번에.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const CLAUDE_MD = path.join(cfg.CLAUDE_DIR, 'CLAUDE.md');

function exists(p) { return fs.existsSync(p) ? '✓' : '·'; }

function run() {
  console.log('CLAUDE_DIR        ' + exists(cfg.CLAUDE_DIR)        + '  ' + cfg.CLAUDE_DIR);
  console.log('settings.json     ' + exists(cfg.SETTINGS_FILE)     + '  ' + cfg.SETTINGS_FILE);
  console.log('CLAUDE.md         ' + exists(CLAUDE_MD)             + '  ' + CLAUDE_MD);
  console.log('projects/         ' + exists(cfg.PROJECTS_DIR)      + '  ' + cfg.PROJECTS_DIR);
  console.log('');
  console.log('knowledge.md      ' + exists(cfg.GLOBAL_KNOWLEDGE)  + '  ' + cfg.GLOBAL_KNOWLEDGE);
  console.log('gotchas.md        ' + exists(cfg.GLOBAL_GOTCHAS)    + '  ' + cfg.GLOBAL_GOTCHAS);
  console.log('');
  console.log('.distill/         ' + exists(cfg.STATE_DIR)         + '  ' + cfg.STATE_DIR);
  console.log('  analyzed.json   ' + exists(path.join(cfg.STATE_DIR, 'analyzed.json')) + '  중복 분석 방지 로그');
  console.log('');
  console.log('extract prompt    ' + exists(cfg.PROMPT_FILE)       + '  ' + cfg.PROMPT_FILE);
}

module.exports = { run };
