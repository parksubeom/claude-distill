// Resolved paths and constants used across every subcommand.
// Keeps the rest of lib/ free of path string-building.

const path = require('path');
const fs = require('fs');
const os = require('os');

const HOME = os.homedir();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR
  ? path.resolve(process.env.CLAUDE_CONFIG_DIR)
  : path.join(HOME, '.claude');

const STATE_DIR = path.join(CLAUDE_DIR, '.distill');
const PENDING_FILE = path.join(STATE_DIR, 'pending.json');
const STATS_FILE = path.join(STATE_DIR, 'stats.json');
const ARCHIVE_DIR = path.join(STATE_DIR, 'archive');

const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');

const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');

// Knowledge / gotchas live in two scopes — global (always) and per-project
// (under <project>/.claude/). globalStore() and projectStore() in lib/store.js
// pick the right one based on entry.scope.
const GLOBAL_KNOWLEDGE = path.join(CLAUDE_DIR, 'knowledge.md');
const GLOBAL_GOTCHAS   = path.join(CLAUDE_DIR, 'gotchas.md');

// Where the package keeps its bundled prompt + templates after install.
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const PROMPT_FILE = path.join(PACKAGE_ROOT, 'prompts', 'extract.md');
const TEMPLATE_DIR = path.join(PACKAGE_ROOT, 'templates');

function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// `cwd` → project slug used in JSONL paths (~/.claude/projects/<slug>/).
// Mirrors Claude Code's own slugging: absolute path with separators replaced.
function cwdToProjectSlug(cwd) {
  return cwd.replace(/[\\\/]/g, '-');
}

module.exports = {
  HOME,
  CLAUDE_DIR,
  STATE_DIR,
  PENDING_FILE,
  STATS_FILE,
  ARCHIVE_DIR,
  SETTINGS_FILE,
  PROJECTS_DIR,
  GLOBAL_KNOWLEDGE,
  GLOBAL_GOTCHAS,
  PACKAGE_ROOT,
  PROMPT_FILE,
  TEMPLATE_DIR,
  ensureStateDir,
  cwdToProjectSlug,
};
