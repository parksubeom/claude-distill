#!/usr/bin/env node
// claude-distill CLI entry point.
//
// Subcommands dispatch to lib/* — each file is small and single-purpose so
// you can read the whole flow top-to-bottom without IDE help.

const path = require('path');
const fs = require('fs');

const cmd = process.argv[2];
const args = process.argv.slice(3);

const help = `claude-distill — Knowledge + Gotchas feedback loop for Claude Code

Usage:
  claude-distill init                    Register SessionEnd hook in ~/.claude/settings.json
  claude-distill analyze [--session=X]   Run extraction on the latest (or named) session
  claude-distill review                  Walk through pending candidates
  claude-distill list [--type=...]       Print accumulated entries
  claude-distill search <query>          Keyword search across all entries
  claude-distill archive [--older=90d]   Move stale entries to archive
  claude-distill where                   Print resolved file paths

Run a subcommand without args for its own help.`;

const dispatch = {
  init:    () => require('../lib/init').run(args),
  analyze: () => require('../lib/analyze').run(args),
  review:  () => require('../lib/review').run(args),
  list:    () => require('../lib/list').run(args),
  search:  () => require('../lib/search').run(args),
  archive: () => require('../lib/archive').run(args),
  where:   () => require('../lib/where').run(args),
  '--help': () => console.log(help),
  '-h':     () => console.log(help),
};

if (!cmd || !dispatch[cmd]) {
  console.log(help);
  process.exit(cmd ? 1 : 0);
}

Promise.resolve(dispatch[cmd]()).catch((err) => {
  console.error('claude-distill: ' + (err && err.message ? err.message : err));
  process.exit(1);
});
