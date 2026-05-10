# claude-distill

> Claude한테 같은 함정을 세 번째 설명하고 계신가요?

세션마다 트레이드오프 결정 (`A 대신 B 선택, 이유는…`), 환경 함정 (`Cursor webview는 confirm() 차단됨`), 같은 실수 (`Claude Code JSONL의 promptId는 항상 null`)가 쌓입니다. 그런데 세션이 끝나면 다 잊혀집니다. CLAUDE.md를 매번 갱신하면 좋겠지만 — 솔직히 안 하죠.

`claude-distill`은 **Stop hook**입니다. 한 번 설치하면:

1. 세션 끝날 때마다 transcript를 자동으로 분석
2. confidence:high 판례 + 사고 보고서를 markdown에 자동 누적
3. 다음 세션부터 Claude가 자동으로 참조 (CLAUDE.md `@reference` 통해)

사용자가 하는 일: `claude-distill init` **한 번. 끝.**

부담 없는 이유:
- **별도 서버 / 계정 없음** — 본인 머신 → Anthropic API 직통. distill 운영자한테도 transcript 안 감
- **의존성 0개, 50KB 미만** — [GitHub](https://github.com/parksubeom/claude-distill)에서 코드 그대로 검수
- **세션당 비용 ~$0** — 4단 게이트로 본 추출 호출 ~10× 컷 (휴리스틱 → Haiku → dedup hash → 재귀 가드)
- **Plain markdown 결과** — 마음에 안 드는 entry는 그 줄 삭제. UI / DB / 락인 없음
- **한국어 / 영어 자동 누적** — transcript 언어 자동 감지, 별도 설정 불필요

---

## 어떤 게 자동으로 누적되나

세션 한 번 했더니 이런 entry들이 알아서 추출돼서 `~/.claude/gotchas.md` / `knowledge.md`에 추가됐습니다 (모두 진짜 dogfood 결과, 편집 없음):

```
⚠️  npm link가 macOS 기본 prefix에서 sudo 없이 실패 — 절대경로로 우회
⚠️  Claude Code JSONL의 promptId가 항상 null — uuid + parentUuid 체인 사용
⚠️  Cursor 빌트인 Claude는 PATH에 `claude` 바이너리를 노출 안 함
🧠  ffmpeg cropdetect의 limit은 어두운 padding에서 ≥32 필요
🧠  Transcript를 마지막 user marker부터 slice하면 분석 prompt ~80% 감소
🧠  CSP `connect-src 'none'`이 webview의 외부 fetch를 이중 차단
```

각 entry는 `Symptom → Trap → Cause → Workaround` 4단으로 자동 정리됩니다 — 다음 세션의 Claude가 그대로 읽고 참조 가능한 형태로. 분석기 prompt가 보수적이라 자명한 사실 / 프로젝트 internal trivia / 검증 안 된 추측은 제외됩니다.

전체 markdown은 IDE에서 그냥 열어보면 됩니다.

---

## 비유

| 파일 | 역할 |
|---|---|
| **`CLAUDE.md`** | 법률 — 변하지 않는 보편 규칙 (직접 작성) |
| **`knowledge.md`** | 판례 — "이 상황엔 이렇게 했다" (자동 누적) |
| **`gotchas.md`** | 사고 보고서 — "같은 실수 반복 금지" (자동 누적) |

법률은 사람이 쓰지만, 판례와 사고 보고서는 매일 쌓이는 거니까 — 그건 자동화될 수 있습니다.

---

## 설치

```bash
npm install -g claude-distill
claude-distill init
```

분석을 위한 LLM 호출 경로 둘 중 하나가 필요합니다:

### 옵션 A — Claude Code CLI 사용자 (사전 설치 필요)

```bash
npm install -g @anthropic-ai/claude-code
# 끝. distill이 자동으로 `claude --print` 호출.
```

### 옵션 B — Claude Code IDE 익스텐션 사용자 (Cursor / VS Code)

빌트인 Claude는 PATH에 노출되지 않으니 **API key**를 사용:

```bash
# https://console.anthropic.com/ 에서 API key 발급 후
echo 'export ANTHROPIC_API_KEY=sk-ant-...' >> ~/.zshrc
source ~/.zshrc
# distill이 환경변수 감지 시 자동으로 API 호출.
```

(또는 옵션 A처럼 CLI 추가 설치도 가능 — IDE와 별개 동작.)

---

`init`이 idempotent하게 두 가지를 등록:

1. `~/.claude/settings.json` 의 **Stop hook** — 세션마다 자동 분석 호출
2. `~/.claude/CLAUDE.md` 끝의 **`@knowledge.md` / `@gotchas.md` 참조** — 다음 세션부터 Claude가 자동 참조

끝입니다. 더 이상 손 안 댑니다.

---

## 어떻게 동작

```
세션 끝
  └─ Stop hook이 `claude-distill analyze --quiet` 자동 실행
     ├─ [재귀 가드] 자식 claude 세션이면 즉시 종료 (CLAUDE_DISTILL_CHILD)
     ├─ [중복 방지] 같은 슬라이스 이미 분석됐으면 종료
     ├─ [게이트 1 — 휴리스틱] 짧은 세션 / 도구 사용 0 / 에러 키워드 0 → 종료
     ├─ [게이트 2 — Haiku] (API key 있을 때) yes/no 1토큰 응답, no면 종료
     ├─ 마지막 user marker 이후 turn slice (보통 ~120 turns / ~85K chars)
     ├─ Sonnet/Opus로 analyzer prompt 전달, JSON 응답 파싱
     ├─ confidence:high entry → ~/.claude/knowledge.md / gotchas.md 즉시 append
     └─ medium / low → drop (사용자 손 안 가게)

다음 세션 시작
  └─ CLAUDE.md의 @reference로 누적된 markdown이 system prompt에 inject
     └─ Claude가 자연스럽게 참조 — 같은 함정 안 빠짐
```

게이트 두 단계는 "대부분의 세션은 인사이트가 없다" 가정으로 본 추출 호출을 ~10× 줄입니다. 게이트가 차단된 세션은 dedup에 마킹돼 같은 슬라이스로 다시 호출돼도 즉시 종료.

---

## 카테고리

분석기가 entry마다 다음 11개 중 하나로 분류합니다:

**판례 (knowledge)**
`trade_off_decision` · `environment_quirk` · `scale_transition` · `tooling_insight` · `performance_insight`

**사고 (gotcha)**
`api_quirk` · `type_shape` · `concurrency_race` · `build_deploy` · `privacy_security` · `ux_regression`

---

## 결과 보기

별도 UI 없습니다. 두 markdown 파일을 그냥 IDE에서 열어보세요:

```bash
~/.claude/knowledge.md
~/.claude/gotchas.md
```

마음에 안 드는 entry는 그 줄을 그냥 삭제하면 됩니다 (markdown이라 자유 편집). 다음 세션부터 그 entry는 더 이상 inject되지 않음.

---

## CLI 명령 (3개)

| 명령 | 용도 | 빈도 |
|---|---|---|
| `claude-distill init` | hook + CLAUDE.md reference 등록 | **한 번** |
| `claude-distill where` | path / 존재 여부 확인 (디버깅) | 가끔 |
| `claude-distill analyze` | 수동 분석 | **거의 안 씀** (hook이 자동) |

`analyze`의 옵션 (잘 안 쓸 것):
- `--no-auto` — 자동 누적 대신 stdout에 JSON 출력
- `--mock` — claude CLI 호출 없이 가짜 entry 1건 (파이프라인 검증용)
- `--session=<file>` — 특정 jsonl 직접 지정
- `--quiet` — 출력 억제 (hook이 사용)
- `--no-gate` / `--force` — 휴리스틱/Haiku 게이트와 재귀 가드 모두 우회 (강제 분석)

환경변수:
- `ANTHROPIC_API_KEY` — 설정 시 Haiku 게이트 자동 활성 (~$0 가까이 게이트 비용)
- `CLAUDE_DISTILL_GATE_MODEL` — 게이트 모델 (기본 `claude-haiku-4-5-20251001`)
- `CLAUDE_DISTILL_MODEL` — 본 추출 모델 (기본 `claude-sonnet-4-6`)
- `CLAUDE_DISTILL_LANG` — 누적 언어 강제 (`ko` / `en`). 미설정 시 transcript 한글 비율로 자동 감지
- `CLAUDE_DISTILL_CHILD` — distill이 spawn한 자식 claude 표식. 수동 설정 불필요 (hook 무한 재귀 차단용 내부 플래그)

---

## 언어 (i18n) — 한국어 / 영어

`knowledge.md` / `gotchas.md`는 한국어 또는 영어로 누적할 수 있습니다. 헤더 / 필드 라벨 (`상황` / `함정` / `근거` … vs `Context` / `Trap` / `Basis` …) 과 entry 본문이 모두 해당 언어로 작성됩니다. 카테고리 키 (`api_quirk`, `trade_off_decision` 등) 는 머신 식별자라 영어 enum 그대로 유지.

**우선순위**:
1. `claude-distill analyze --lang=ko|en` (명시)
2. `CLAUDE_DISTILL_LANG=ko|en` 환경변수
3. **transcript 자동 감지** — 세션 turn에서 한글 음절 비율이 5% 넘으면 `ko`, 아니면 `en`
4. `process.env.LANG` (예: `ko_KR.UTF-8` → `ko`)
5. fallback: `en`

대부분의 사용자는 **3번 자동 감지로 충분** — 한국어로 코딩하는 세션은 한국어로, 영어 세션은 영어로 자연스럽게 누적됩니다. 별도 설정 없이.

영어 위주로 쓰다 한국어 entry가 섞이는 게 싫다면 `~/.zshrc`에 `export CLAUDE_DISTILL_LANG=en` 으로 고정.

> **혼재 주의**: 기존 markdown이 영어로 쌓여있을 때 locale을 `ko`로 바꾸면, 같은 파일에 영/한 entry가 섞입니다. plain markdown이라 사용자가 직접 정리 가능 (헤더 / 라벨 일괄 치환). v0.4 첫 cut은 단일 파일 정책 — 언어별 파일 분리 (`knowledge.ko.md`)는 추후 검토.

---

## 프라이버시 / 보안

**별도 서버 없음.** distill은 본인 머신 → Anthropic API 직통입니다. 중간에 어떤 third-party 서버도 없음 — 코드도 50KB 미만, [GitHub](https://github.com/parksubeom/claude-distill)에서 그대로 검수 가능.

- **transcript 전송 범위**: 본인의 `ANTHROPIC_API_KEY`로 본인 계정의 Claude API에만 전달. distill 운영자(저)에게도 안 감.
- **API key 저장**: distill은 key를 절대 파일에 안 씀. 본인이 `~/.zshrc` 등에 export한 환경변수만 읽음.
- **권한 범위**: transcript는 read-only, 결과 markdown 2개만 append. 코드/repo는 절대 안 건드림.
- **잔존물**: `~/.claude/.distill/analyzed.json`에는 transcript 내용이 아니라 SHA hash 12자만 저장 (중복 분석 방지용).
- **결과는 plain markdown**: 마음에 안 드는 entry는 줄 째로 삭제. 다음 세션부터 inject 안 됨.
- **완전 비활성화**: `~/.claude/settings.json`의 `hooks.Stop` 항목 삭제 또는 `npm uninstall -g claude-distill`.

**시크릿 우려**: transcript에 API key / 패스워드를 평문으로 입력한 적 있다면 분석 prompt에도 그게 들어갑니다. Anthropic API의 데이터 처리 정책 그대로 따르며, distill 자체는 그걸 디스크에 저장하지 않음. 민감한 transcript가 있는 세션은 `claude-distill analyze` 실행 전 `~/.claude/projects/<project>/`에서 해당 jsonl을 직접 삭제하면 됩니다.

---

## FAQ

**Q. CLAUDE.md를 직접 작성하면 안 되나?**
A. 직접 작성 가능. `claude-distill`은 매일 쌓이는 자잘한 판례/사고를 자동으로 잡아내는 보조 도구. CLAUDE.md는 변하지 않는 보편 규칙용으로 그대로 쓰시면 됩니다.

**Q. 토큰 비용은?**
A. 게이트가 본 추출의 90% 가량을 사전에 컷합니다 (v0.3+). 통과한 세션만 prompt ~85K chars (~20K tokens) input + 응답 ~2K tokens output → Sonnet 기준 세션당 약 $0.10. 그 외 세션은 휴리스틱(무료) / Haiku 게이트(1토큰 응답, 사실상 0원)에서 종료. `ANTHROPIC_API_KEY` 설정 시 Haiku 게이트가 켜져 비용 효율이 가장 좋음.

**Q. 게이트 때문에 인사이트를 놓치는 거 아닌가?**
A. 휴리스틱이 보수적이라 false negative 가능 (예: 도구 사용 0인 토론 세션). 그런 세션은 `claude-distill analyze --no-gate`로 강제 분석 가능. 게이트가 차단하는 패턴이 본인 워크플로와 안 맞으면 README의 [issue tracker](https://github.com/parksubeom/claude-distill/issues)에 알려주세요.

**Q. confidence:medium / low는 왜 drop?**
A. 노이즈 누적이 가장 큰 실패 패턴이라 보수적으로 시작. 향후 `--keep-medium` 옵션 추가 가능.

**Q. 프로젝트별 누적은?**
A. 전역이 기본. 프로젝트별 원하면 `<project>/.claude/CLAUDE.md`에 직접 `@.claude/knowledge.md` 추가. v0.3+에서 `--scope=project` 옵션 자동화 예정.

**Q. Cursor / VS Code Claude Code 익스텐션 사용자도 됨?**
A. **됩니다.** transcript는 익스텐션도 같은 위치(`~/.claude/projects/`)에 저장. 분석을 위한 LLM 호출만 별도 경로가 필요한데, `ANTHROPIC_API_KEY`만 환경변수로 export하면 distill이 자동으로 Anthropic API 직접 호출 (Node 18+ 빌트인 fetch).

**Q. 다른 LLM 백엔드?**
A. 현재 `claude` CLI + Anthropic API 두 가지. `--backend=cli|api|auto` 옵션. 기본 `auto`는 `ANTHROPIC_API_KEY` 있으면 API 우선, 없으면 CLI fallback. OpenAI / 로컬 LLM 지원은 v0.3+.

**Q. 잠시 멈추거나 완전히 제거하려면?**
A. 일시 정지: `~/.claude/settings.json`의 `hooks.Stop` 배열에서 distill entry만 빼면 됨. 완전 제거: `npm uninstall -g claude-distill` 후 `~/.claude/CLAUDE.md` 끝의 `<!-- claude-distill auto-references -->` 블록 삭제. 누적된 `knowledge.md` / `gotchas.md`는 유지하고 싶으면 그대로 두거나, 완전 초기화하려면 삭제.

**Q. 잘못 누적된 entry는 어떻게 지워?**
A. `~/.claude/knowledge.md` 또는 `gotchas.md`에서 그 entry의 `### ...` 블록만 텍스트로 삭제. 다음 세션부터 inject 안 됨. plain markdown이라 자유 편집.

**Q. 회사 코드 / 시크릿이 transcript에 있어도 괜찮나?**
A. 분석은 본인의 Anthropic 계정으로만 흘러가지만 (별도 서버 없음 — 위 보안 섹션 참조), API 호출 자체가 회사 정책에 막혀있다면 distill도 못 씀. 의심되는 세션은 `~/.claude/projects/<project>/<session>.jsonl`을 직접 삭제하거나, 해당 세션은 `claude-distill analyze`가 실행되기 전에 hook을 잠시 끄면 됨.

**Q. 어떤 OS에서 됨?**
A. macOS / Linux / Windows (Node 18+ 설치돼있으면). 경로는 전부 `os.homedir()`로 동적 결정 — 하드코딩 없음. 테스트는 macOS 위주지만 OS-specific 코드는 없음.

---

## 상태

v0.4 — i18n. `knowledge.md` / `gotchas.md`를 한국어 / 영어로 자동 누적 (transcript 언어 감지 또는 `CLAUDE_DISTILL_LANG`).
v0.3 — 게이트 도입 (휴리스틱 + Haiku) + Stop 훅 무한 재귀 가드. 본 추출 호출 ~10× 감소.
v0.2 — 자동 누적 모델로 재정비.

## License

MIT © parksubeom
