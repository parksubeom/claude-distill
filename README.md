# claude-distill

> Claude한테 같은 함정을 세 번째 설명하고 계신가요?

세션마다 트레이드오프 결정 (`A 대신 B 선택, 이유는…`), 환경 함정 (`Cursor webview는 confirm() 차단됨`), 같은 실수 (`Claude Code JSONL의 promptId는 항상 null`)가 쌓입니다. 그런데 세션이 끝나면 다 잊혀집니다. CLAUDE.md를 매번 갱신하면 좋겠지만 — 솔직히 안 하죠.

`claude-distill`은 **Stop hook**입니다. 한 번 설치하면:

1. 세션 끝날 때마다 transcript를 자동으로 분석
2. confidence:high 판례 + 사고 보고서를 markdown에 자동 누적
3. 다음 세션부터 Claude가 자동으로 참조 (CLAUDE.md `@reference` 통해)

사용자가 하는 일: `claude-distill init` **한 번. 끝.**

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
     ├─ 마지막 user marker 이후 turn slice (보통 ~120 turns / ~85K chars)
     ├─ `claude --print`로 analyzer prompt 전달
     ├─ JSON 응답 파싱
     ├─ confidence:high entry → ~/.claude/knowledge.md / gotchas.md 즉시 append
     └─ medium / low → drop (사용자 손 안 가게)

다음 세션 시작
  └─ CLAUDE.md의 @reference로 누적된 markdown이 system prompt에 inject
     └─ Claude가 자연스럽게 참조 — 같은 함정 안 빠짐
```

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

---

## 프라이버시

- 모든 추출이 사용자 머신에서 진행. transcript는 사용자가 (또는 hook이) 호출할 때만 Claude API로 전달.
- 결과는 plain markdown. git ignore 규칙 그대로 따름 (전역 파일이라 default ignore).
- hook은 `~/.claude/settings.json`에서 직접 비활성화 가능.
- 같은 transcript를 두 번 분석하지 않도록 `~/.claude/.distill/analyzed.json`에 sha hash만 저장.

---

## FAQ

**Q. CLAUDE.md를 직접 작성하면 안 되나?**
A. 직접 작성 가능. `claude-distill`은 매일 쌓이는 자잘한 판례/사고를 자동으로 잡아내는 보조 도구. CLAUDE.md는 변하지 않는 보편 규칙용으로 그대로 쓰시면 됩니다.

**Q. 토큰 비용은?**
A. 세션당 1회 분석. 보통 prompt ~85K chars (~20K tokens) input, 응답 ~2K tokens output. Sonnet 기준 세션당 약 $0.10. 가벼운 세션은 더 적음.

**Q. confidence:medium / low는 왜 drop?**
A. 노이즈 누적이 가장 큰 실패 패턴이라 보수적으로 시작. 향후 `--keep-medium` 옵션 추가 가능.

**Q. 프로젝트별 누적은?**
A. 전역이 기본. 프로젝트별 원하면 `<project>/.claude/CLAUDE.md`에 직접 `@.claude/knowledge.md` 추가. v0.3+에서 `--scope=project` 옵션 자동화 예정.

**Q. Cursor / VS Code Claude Code 익스텐션 사용자도 됨?**
A. **됩니다.** transcript는 익스텐션도 같은 위치(`~/.claude/projects/`)에 저장. 분석을 위한 LLM 호출만 별도 경로가 필요한데, `ANTHROPIC_API_KEY`만 환경변수로 export하면 distill이 자동으로 Anthropic API 직접 호출 (Node 18+ 빌트인 fetch).

**Q. 다른 LLM 백엔드?**
A. 현재 `claude` CLI + Anthropic API 두 가지. `--backend=cli|api|auto` 옵션. 기본 `auto`는 `ANTHROPIC_API_KEY` 있으면 API 우선, 없으면 CLI fallback. OpenAI / 로컬 LLM 지원은 v0.3+.

---

## 상태

v0.2 — 자동 누적 모델로 재정비. 실 사용 결과 알려주시면 prompt 튜닝 / 카테고리 조정 진행합니다.

## License

MIT © parksubeom
