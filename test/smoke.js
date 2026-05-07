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

console.log('\n--- where ---');
where.run([]);

console.log('\n✓ smoke test 완료. 검사: ' + cfg.CLAUDE_DIR);
