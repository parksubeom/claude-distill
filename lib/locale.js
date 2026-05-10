// Locale resolution + label tables for ko / en.
//
// 우선순위:
//   1. --lang=ko|en 플래그
//   2. CLAUDE_DISTILL_LANG 환경변수
//   3. transcript 자동 감지 (Hangul 비율)
//   4. process.env.LANG
//   5. fallback 'en'
//
// 지원 범위는 의도적으로 ko / en 둘로만 제한. 추가 언어는 LABELS 테이블 + detector
// 분기만 늘리면 되지만 v0.4 첫 cut에선 두 언어로 시작.

const SUPPORTED = ['ko', 'en'];
const DEFAULT = 'en';

const LABELS = {
  en: {
    knowledgeHeader:
      '# Knowledge — case law\n\n' +
      '> Judgment calls worth remembering. Maintained by [claude-distill](https://github.com/parksubeom/claude-distill).\n\n',
    gotchasHeader:
      '# Gotchas — incident reports\n\n' +
      '> Mistakes worth not repeating. Maintained by [claude-distill](https://github.com/parksubeom/claude-distill).\n\n',
    category: 'Category',
    confidence: 'Confidence',
    date: 'Date',
    source: 'Source',
    sessionWord: 'session',
    projectWord: 'project',
    cmdsWord: 'cmds',
    contextLabel: 'Context',
    symptomLabel: 'Symptom',
    insightLabel: 'Insight',
    trapLabel: 'Trap',
    basisLabel: 'Basis',
    applicationLabel: 'Application',
    tagsLabel: 'Tags',
    untitled: '(untitled)',
  },
  ko: {
    knowledgeHeader:
      '# 판례 — Knowledge\n\n' +
      '> 다음에도 기억할 만한 결정. [claude-distill](https://github.com/parksubeom/claude-distill)이 자동 누적합니다.\n\n',
    gotchasHeader:
      '# 사고 보고서 — Gotchas\n\n' +
      '> 다시 빠지지 말아야 할 함정. [claude-distill](https://github.com/parksubeom/claude-distill)이 자동 누적합니다.\n\n',
    category: '카테고리',
    confidence: '신뢰도',
    date: '날짜',
    source: '출처',
    sessionWord: '세션',
    projectWord: '프로젝트',
    cmdsWord: '명령',
    contextLabel: '상황',
    symptomLabel: '증상',
    insightLabel: '인사이트',
    trapLabel: '함정',
    basisLabel: '근거',
    applicationLabel: '적용',
    tagsLabel: '태그',
    untitled: '(제목 없음)',
  },
};

function normalize(v) {
  if (!v) return null;
  const s = String(v).toLowerCase().trim();
  if (s.startsWith('ko')) return 'ko';
  if (s.startsWith('en')) return 'en';
  return null;
}

// transcript의 turns를 stringify해서 한글 음절 (U+AC00–U+D7A3) 비율을 계산.
// 시그널이 약하면 (글자 자체가 적으면) null 반환 — 호출자가 다음 우선순위로.
function detectFromTranscript(t) {
  if (!t || !Array.isArray(t.turns) || t.turns.length === 0) return null;
  let kor = 0;
  let letters = 0;
  for (const turn of t.turns) {
    const s = JSON.stringify(turn);
    for (let i = 0; i < s.length; i++) {
      const code = s.charCodeAt(i);
      const isHangul = code >= 0xAC00 && code <= 0xD7A3;
      const isLatin = (code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A);
      if (isHangul) kor++;
      if (isHangul || isLatin) letters++;
    }
  }
  if (letters < 200) return null;
  // 한글 음절은 글자 하나당 정보량이 라틴 알파벳보다 크므로 5%만 넘어도
  // 실제로는 한국어 위주의 세션. 임계값 보수적으로 0.05.
  return kor / letters > 0.05 ? 'ko' : 'en';
}

function resolveLocale({ flag, transcript } = {}) {
  const fromFlag = normalize(flag);
  if (fromFlag) return fromFlag;
  const fromEnv = normalize(process.env.CLAUDE_DISTILL_LANG);
  if (fromEnv) return fromEnv;
  const fromTranscript = detectFromTranscript(transcript);
  if (fromTranscript) return fromTranscript;
  const fromSysLang = normalize(process.env.LANG);
  if (fromSysLang) return fromSysLang;
  return DEFAULT;
}

function labels(locale) {
  return LABELS[SUPPORTED.includes(locale) ? locale : DEFAULT];
}

// LLM에 출력 언어를 강제하는 directive. JSON 식별자 필드는 enum 그대로
// 유지하라고 명시 — 카테고리 키가 번역되면 store.js의 isGotcha 분기 등이 깨짐.
function promptDirective(locale) {
  if (locale === 'ko') {
    return [
      '',
      '---',
      '',
      'OUTPUT LANGUAGE: 모든 entry의 자연어 필드(title, context, insight, basis, application)와 tags 배열은 **한국어**로 작성하세요.',
      '단, 식별자 필드(type, category, confidence)는 명세된 영어 enum 값 그대로 유지 — 번역 금지.',
      'JSON 키 이름과 구조도 그대로. 한국어로 표현하기 어려운 기술 용어는 영어 그대로 두어도 됩니다.',
    ].join('\n');
  }
  return [
    '',
    '---',
    '',
    'OUTPUT LANGUAGE: Write the natural-language fields (title, context, insight, basis, application) and tags array in **English**.',
    'Keep identifier fields (type, category, confidence) as their specified English enum values — do not translate.',
    'Do not change JSON key names or structure.',
  ].join('\n');
}

module.exports = {
  SUPPORTED,
  DEFAULT,
  resolveLocale,
  detectFromTranscript,
  labels,
  promptDirective,
};
