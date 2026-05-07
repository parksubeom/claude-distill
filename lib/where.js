// `claude-distill where` — print every path the tool reads/writes.
// Useful sanity check ("did init create the right files?").

const fs = require('fs');
const cfg = require('./config');

function exists(p) { return fs.existsSync(p) ? '✓' : '·'; }

function run() {
  console.log('CLAUDE_DIR        ' + exists(cfg.CLAUDE_DIR)        + '  ' + cfg.CLAUDE_DIR);
  console.log('settings.json     ' + exists(cfg.SETTINGS_FILE)     + '  ' + cfg.SETTINGS_FILE);
  console.log('projects/         ' + exists(cfg.PROJECTS_DIR)      + '  ' + cfg.PROJECTS_DIR);
  console.log('');
  console.log('.distill/         ' + exists(cfg.STATE_DIR)         + '  ' + cfg.STATE_DIR);
  console.log('  pending.json    ' + exists(cfg.PENDING_FILE)      + '  ' + cfg.PENDING_FILE);
  console.log('  archive/        ' + exists(cfg.ARCHIVE_DIR)       + '  ' + cfg.ARCHIVE_DIR);
  console.log('');
  console.log('knowledge.md      ' + exists(cfg.GLOBAL_KNOWLEDGE)  + '  ' + cfg.GLOBAL_KNOWLEDGE);
  console.log('gotchas.md        ' + exists(cfg.GLOBAL_GOTCHAS)    + '  ' + cfg.GLOBAL_GOTCHAS);
  console.log('');
  console.log('extract prompt    ' + exists(cfg.PROMPT_FILE)       + '  ' + cfg.PROMPT_FILE);
}

module.exports = { run };
