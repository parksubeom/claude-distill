// `claude-distill init [--no-claude-md]`
//
// 두 가지를 한 번에 등록:
//   1. ~/.claude/settings.json 의 Stop hook (자동 분석)
//   2. ~/.claude/CLAUDE.md 끝에 @knowledge.md / @gotchas.md 참조 라인
//      → 다음 세션부터 Claude가 누적된 판례/사고를 자연스럽게 참조
//
// idempotent — 두 번 실행해도 중복 등록 안 함.
//
// --no-claude-md 옵션: CLAUDE.md 자동 편집 건너뛰기 (사용자가 직접 추가)

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const cfg = require('./config');

// PATH에 `claude-distill`이 있으면 그대로, 없으면 자기 자신의 절대 경로 사용.
// npm 글로벌 install 없이도 init 한 번으로 끝나게 만드는 핵심.
function resolveHookCommand() {
  try {
    execSync('which claude-distill', { stdio: 'ignore' });
    return 'claude-distill analyze --quiet';
  } catch {
    const binPath = path.join(cfg.PACKAGE_ROOT, 'bin', 'distill.js');
    return `node ${binPath} analyze --quiet`;
  }
}

const HOOK_COMMAND = resolveHookCommand();
const CLAUDE_MD = path.join(cfg.CLAUDE_DIR, 'CLAUDE.md');
const REFERENCE_BLOCK = `
<!-- claude-distill auto-references — accumulated lessons from past sessions -->
@~/.claude/knowledge.md
@~/.claude/gotchas.md
`;

function readSettings() {
  if (!fs.existsSync(cfg.SETTINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(cfg.SETTINGS_FILE, 'utf8')); }
  catch { return {}; }
}

function writeSettings(s) {
  fs.mkdirSync(path.dirname(cfg.SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(cfg.SETTINGS_FILE, JSON.stringify(s, null, 2) + '\n');
}

function hookAlreadyInstalled(s) {
  const stop = (s.hooks && s.hooks.Stop) || [];
  for (const matcher of stop) {
    for (const h of (matcher.hooks || [])) {
      if (h.command && h.command.includes('claude-distill')) return true;
    }
  }
  return false;
}

function ensureHook(quiet) {
  const s = readSettings();
  if (hookAlreadyInstalled(s)) {
    if (!quiet) console.log('· Hook 이미 등록됨 — 건너뜀');
    return false;
  }
  s.hooks = s.hooks || {};
  s.hooks.Stop = s.hooks.Stop || [];
  s.hooks.Stop.push({
    matcher: '*',
    hooks: [{ type: 'command', command: HOOK_COMMAND }],
  });
  writeSettings(s);
  if (!quiet) console.log('✓ Stop hook 등록 → ' + cfg.SETTINGS_FILE);
  return true;
}

function ensureClaudeMdReference(quiet) {
  let body = '';
  if (fs.existsSync(CLAUDE_MD)) {
    body = fs.readFileSync(CLAUDE_MD, 'utf8');
  }
  if (body.includes('claude-distill auto-references')) {
    if (!quiet) console.log('· CLAUDE.md @reference 이미 등록됨 — 건너뜀');
    return false;
  }
  // 빈 파일이면 헤더부터, 있으면 뒤에 append
  const trailer = body.endsWith('\n') || body === '' ? '' : '\n';
  fs.mkdirSync(path.dirname(CLAUDE_MD), { recursive: true });
  fs.appendFileSync(CLAUDE_MD, trailer + REFERENCE_BLOCK);
  if (!quiet) console.log('✓ ' + CLAUDE_MD + ' 끝에 @reference 추가');
  return true;
}

function parseFlags(args) {
  const flags = { noClaudeMd: false, quiet: false };
  for (const a of args) {
    if (a === '--no-claude-md') flags.noClaudeMd = true;
    if (a === '--quiet') flags.quiet = true;
  }
  return flags;
}

function run(args) {
  const flags = parseFlags(args);
  cfg.ensureStateDir();
  ensureHook(flags.quiet);
  if (!flags.noClaudeMd) ensureClaudeMdReference(flags.quiet);
  if (!flags.quiet) {
    console.log('');
    console.log('이제 끝입니다. 세션 끝낼 때마다 알아서 분석 + 누적합니다.');
    console.log('확인하고 싶으면:  ' + cfg.GLOBAL_KNOWLEDGE);
    console.log('              :  ' + cfg.GLOBAL_GOTCHAS);
  }
}

module.exports = { run };
