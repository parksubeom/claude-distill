// `claude-distill init`
//
// Registers the SessionEnd hook in ~/.claude/settings.json. Idempotent —
// running it twice doesn't double-register. Also creates ~/.claude/.distill/
// scaffold so subsequent runs find their files.

const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const HOOK_NAME = 'claude-distill';
const HOOK_COMMAND = 'claude-distill analyze --quiet';

function readSettings() {
  if (!fs.existsSync(cfg.SETTINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8')); }
  catch { return {}; }
}

function writeSettings(s) {
  fs.mkdirSync(path.dirname(cfg.SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(cfg.SETTINGS_FILE, JSON.stringify(s, null, 2) + '\n');
}

function alreadyInstalled(s) {
  const stop = (s.hooks && s.hooks.Stop) || [];
  for (const matcher of stop) {
    for (const h of (matcher.hooks || [])) {
      if (h.command && h.command.includes('claude-distill')) return true;
    }
  }
  return false;
}

function run(args) {
  cfg.ensureStateDir();
  const s = readSettings();
  if (alreadyInstalled(s)) {
    console.log('✓ Hook already registered. Nothing to do.');
    console.log('  Settings: ' + cfg.SETTINGS_FILE);
    return;
  }
  s.hooks = s.hooks || {};
  s.hooks.Stop = s.hooks.Stop || [];
  s.hooks.Stop.push({
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: HOOK_COMMAND,
      },
    ],
  });
  writeSettings(s);
  console.log('✓ Registered Stop hook in ' + cfg.SETTINGS_FILE);
  console.log('✓ Created ' + cfg.STATE_DIR + ' for staged candidates');
  console.log('');
  console.log('Try a session, then run:');
  console.log('  claude-distill review');
}

module.exports = { run };
