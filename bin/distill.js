#!/usr/bin/env node
// claude-distill — zero-effort knowledge accumulator for Claude Code.
//
// 명령은 단 3개:
//   init    — Stop hook + CLAUDE.md @reference 한 번 등록
//   analyze — 자동 분석 (Hook이 호출, 직접 호출 불필요)
//   where   — 모든 경로 sanity check
//
// 그 외(review/list/search/archive)는 의도적으로 없습니다. markdown 파일을
// 그냥 IDE에서 열어 보시면 됩니다.

const cmd = process.argv[2];
const args = process.argv.slice(3);

const help = `claude-distill — Knowledge + Gotchas auto-accumulator for Claude Code

설치:
  claude-distill init       Stop hook + CLAUDE.md reference 등록 (한 번만)

확인:
  claude-distill where      모든 파일 경로 / 존재 여부

수동 분석 (보통 Hook이 자동으로 함):
  claude-distill analyze [--no-auto] [--mock] [--quiet]

결과는 plain markdown:
  ~/.claude/knowledge.md    판례 (전역)
  ~/.claude/gotchas.md      사고 보고서 (전역)
또는 프로젝트별:
  <project>/.claude/knowledge.md
  <project>/.claude/gotchas.md

editor에서 직접 열어보시면 됩니다 — review UI 없습니다.`;

const dispatch = {
  init:    () => require('../lib/init').run(args),
  analyze: () => require('../lib/analyze').run(args),
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
