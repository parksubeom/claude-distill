// Minimal smoke test — exercises the pipeline end-to-end with --mock,
// then runs the review flow against the fake pending entry. Intended
// as a sanity check; not a full test suite.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-distill-test-'));
const fakeClaude = path.join(tmp, 'fake-claude-home');
fs.mkdirSync(fakeClaude, { recursive: true });

// Set CLAUDE_CONFIG_DIR so the tool doesn't touch the real ~/.claude.
process.env.CLAUDE_CONFIG_DIR = fakeClaude;

const cfg = require('../lib/config');
const init = require('../lib/init');
const where = require('../lib/where');
const analyze = require('../lib/analyze');
const list = require('../lib/list');
const store = require('../lib/store');

console.log('==> claude-distill smoke test');
console.log('CLAUDE_CONFIG_DIR =', cfg.CLAUDE_DIR);

console.log('\n--- init ---');
init.run([]);

console.log('\n--- analyze --mock ---');
analyze.run(['--mock', '--quiet']);

console.log('\n--- pending content ---');
console.log(fs.readFileSync(cfg.PENDING_FILE, 'utf8'));

console.log('\n--- store.appendEntry directly (skip review) ---');
const pending = JSON.parse(fs.readFileSync(cfg.PENDING_FILE, 'utf8'));
const entry = pending[0];
entry.scope = 'global';
const out = store.appendEntry(entry);
console.log('appended to: ' + out);

console.log('\n--- list ---');
list.run(['--type=gotcha']);

console.log('\n--- where ---');
where.run([]);

console.log('\n✓ smoke test complete. Inspect: ' + cfg.CLAUDE_DIR);
