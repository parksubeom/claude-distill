# claude-distill

> Hook-based feedback loop for Claude Code: every session → extract knowledge + gotchas → user reviews → accumulate.

## Why

Claude Code is great at *writing* code. It's bad at *learning from* the work it just did.

Every session you make trade-off decisions ("we picked option A because…"), discover environment quirks ("Cursor webview blocks `confirm()`"), and step on the same rakes ("Claude Code JSONL has `promptId: null` on every assistant line"). All of that walks out the door at session end.

`claude-distill` is the missing layer. Three files:

- **`CLAUDE.md`** — your *law*. Rules every session must follow. (Already exists.)
- **`knowledge.md`** — your *case law*. "Last time in this situation we did X because Y." (NEW)
- **`gotchas.md`** — your *incident reports*. "Don't make the same mistake again." (NEW)

The distill hook reads each session's transcript, asks Claude to extract candidate entries, and queues them for your review. You approve / edit / reject; approved entries accumulate.

## Install

```bash
npm install -g claude-distill
claude-distill init     # registers the SessionEnd hook in ~/.claude/settings.json
```

## Use

Nothing — that's the point. Work as usual. At session end the hook fires and stages candidates.

When you start the next session, or whenever you want, run:

```bash
claude-distill review
```

You see each candidate one at a time:

```
🧠 Distill — 3 candidates from session 8f14d0f4

[1/3] ⚠️ GOTCHA · api_quirk · confidence: high
┌──────────────────────────────────────────────────────────┐
│ Title:  Claude Code JSONL: assistant.promptId is null    │
│ Symptom: tokenUsage 0/1042 matches                       │
│ Trap:    docs say promptId, reality is uuid+parentUuid   │
│ Tags:    claude-code · jsonl · token-tracking            │
│ Scope:   ◉ Project   ○ Global                            │
└──────────────────────────────────────────────────────────┘
[a]ccept  [e]dit  [r]eject  [s]kip-for-later
```

Approved entries land in:

- `~/.claude/knowledge.md` (global) or `<project>/.claude/knowledge.md` (project-scoped)
- `~/.claude/gotchas.md` (global) or `<project>/.claude/gotchas.md` (project-scoped)

Both are plain Markdown, written for humans first. Open them in your editor any time. They're committable too — share `<project>/.claude/gotchas.md` with your team.

## Reference loop — how Claude actually uses this

After your first approved entries land, add this to your `CLAUDE.md`:

```markdown
@~/.claude/knowledge.md
@~/.claude/gotchas.md

# Or for project-scoped:
@.claude/knowledge.md
@.claude/gotchas.md
```

The `@` reference syntax injects the file contents into Claude's system prompt. Now your past lessons are available to every future session. The loop is closed.

## Categories

### Knowledge — judgment calls

| Category | Captures |
|---|---|
| `trade_off_decision` | "We picked A over B because…" |
| `environment_quirk` | Tool / runtime / IDE quirks worth remembering |
| `scale_transition` | Threshold information ("at N lines, refactor") |
| `tooling_insight` | Tool flags, commands, gotchas you figured out |
| `performance_insight` | Measured numbers + cause |

### Gotchas — mistakes to avoid

| Category | Captures |
|---|---|
| `api_quirk` | Undocumented library / API behavior |
| `type_shape` | Data shape pitfalls |
| `concurrency_race` | Async / ordering bugs |
| `build_deploy` | Build / deploy traps |
| `privacy_security` | Security mistakes |
| `ux_regression` | UX regression patterns |

## CLI

```
claude-distill init                    Register SessionEnd hook (idempotent)
claude-distill analyze [--session=X]   Run analysis manually (debug)
claude-distill review                  Walk through pending candidates
claude-distill list [--type=...]       Print accumulated entries
claude-distill search <query>          Keyword search across all entries
claude-distill archive [--older=90d]   Move stale entries to archive
claude-distill where                   Print resolved file paths
```

## How extraction works

1. Hook fires on `SessionEnd`
2. Last N turns of the session JSONL are extracted (default: turns after the latest `<command-name>` marker)
3. Sent to Claude (via `claude` CLI by default; alternative: direct Anthropic API with your own key) with the analyzer prompt
4. Response is JSON: 0–5 candidate entries
5. Saved to `~/.claude/.distill/pending.json`
6. Next time you run `claude-distill review`, you walk through them

The analyzer prompt explicitly excludes self-evident facts, project-internal trivia with no transferable lesson, and anything already in your existing `knowledge.md` / `gotchas.md` (de-duplication).

## Privacy

- All extraction happens on your machine. Transcript content goes to Claude only when you (or the hook) call it.
- Pending candidates live at `~/.claude/.distill/pending.json` until reviewed.
- You explicitly choose `global` vs `project` scope per entry. Project scope means the file lives in the repo and follows your normal git ignore rules.
- The hook reads only the latest session JSONL — you can disable it in `~/.claude/settings.json` any time.

## Status

Pre-1.0 — actively iterating. Use at your own pace. PRs and issues welcome.

## License

MIT © parksubeom
