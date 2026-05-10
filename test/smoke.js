// 가벼운 end-to-end 동작 확인 — 진짜 LLM 호출 없이 mock으로 pipeline 검증.

const fs = require('fs');
const path = require('path');
const os = require('os');

// 실제 ~/.claude를 건드리지 않게 임시 디렉토리에 격리
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-distill-test-'));
const fakeClaude = path.join(tmp, 'fake-claude-home');
fs.mkdirSync(fakeClaude, { recursive: true });
process.env.CLAUDE_CONFIG_DIR = fakeClaude;

const cfg = require('../lib/config');
const init = require('../lib/init');
const where = require('../lib/where');
const analyze = require('../lib/analyze');

console.log('==> claude-distill smoke test');
console.log('CLAUDE_CONFIG_DIR =', cfg.CLAUDE_DIR);

console.log('\n--- init ---');
init.run([]);

console.log('\n--- analyze --mock (자동 누적) ---');
analyze.run(['--mock']);

console.log('\n--- 결과 gotchas.md ---');
console.log(fs.readFileSync(cfg.GLOBAL_GOTCHAS, 'utf8'));

console.log('\n--- analyze --mock --lang=ko (한국어 누적) ---');
analyze.run(['--mock', '--lang=ko']);

console.log('\n--- 결과 gotchas.md (영/한 혼재 확인) ---');
console.log(fs.readFileSync(cfg.GLOBAL_GOTCHAS, 'utf8'));

console.log('\n--- locale 모듈 단위 검증 ---');
const localeMod = require('../lib/locale');
const koTranscript = { turns: [{ role: 'user', content: '한국어로 디버깅 세션 진행 중. 에러 발생. 함수 호출 실패. 원인 파악. '.repeat(20) }] };
const enTranscript = { turns: [{ role: 'user', content: 'Debugging session in English with stack trace and error output. '.repeat(20) }] };
console.log('  detect ko transcript →', localeMod.detectFromTranscript(koTranscript));
console.log('  detect en transcript →', localeMod.detectFromTranscript(enTranscript));
console.log('  resolve {flag:ko}    →', localeMod.resolveLocale({ flag: 'ko' }));
console.log('  resolve {flag:EN}    →', localeMod.resolveLocale({ flag: 'EN' }));
console.log('  resolve {flag:fr}    → (fallback)', localeMod.resolveLocale({ flag: 'fr' }));

console.log('\n--- where ---');
where.run([]);

console.log('\n✓ smoke test 완료. 검사: ' + cfg.CLAUDE_DIR);
