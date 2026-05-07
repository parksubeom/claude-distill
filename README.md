# claude-distill

> Claude한테 같은 함정을 세 번째 설명하고 계신가요?

세션마다 트레이드오프 결정 (`A 대신 B 선택, 이유는…`), 환경 함정 (`Cursor webview는 confirm() 차단됨`), 같은 실수 (`Claude Code JSONL의 promptId는 항상 null`)가 쌓입니다. 그런데 세션이 끝나면 다 잊혀집니다. CLAUDE.md를 매번 갱신하면 좋겠지만 — 솔직히 안 하죠.

`claude-distill`은 **Stop hook**입니다. 한 번 설치하면:

1. 세션 끝날 때마다 transcript를 자동으로 분석
2. confidence:high 판례 + 사고 보고서를 markdown에 자동 누적
3. 다음 세션부터 Claude가 자동으로 참조 (CLAUDE.md `@reference` 통해)

사용자가 하는 일: `claude-distill init` **한 번. 끝.**

---

## 진짜 결과 발췌

이 도구를 만들면서 dogfood한 첫 세션에서 자동으로 추출된 entry입니다 (편집 없음):

```markdown
## ⚠️ Cursor's bundled Claude does not put `claude` on PATH
**Category**: environment_quirk · **Confidence**: high

**Context**: claude-distill는 transcript 분석에 `claude` CLI를
shell out으로 호출. Cursor + Claude integration이 깔린 머신에서
`which claude`가 비어있어 analyze가 `claude not found`로 실패.

**Insight**: Cursor / IDE-bundled Claude 통합은 사용자 shell PATH에
`claude` 바이너리를 노출하지 않음. CLI에 의존하는 도구는
사용자에게 `@anthropic-ai/claude-code` 별도 설치를 안내해야 하고,
부재 시 친절한 메시지를 surface해야 함.

**Basis**: `claude not found` from `where`,
later `sudo npm install -g @anthropic-ai/claude-code`
produced `/usr/local/bin/claude` and `2.1.132 (Claude Code)`.

**Application**: `claude` shell out 도구는 PATH up-front check + 설치
가이드 surface. IDE 사용자가 CLI도 깔려있다고 가정하지 말 것.
```

`Symptom → Trap → Cause → Workaround` 4단 구조로 자동 정리됩니다. 분석기가 다른 사용자에게도 transferable한 lesson만 추출하도록 prompt가 보수적으로 작성됨 (자명한 사실 / 프로젝트 internal trivia / 검증 안 된 추측은 제외).

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
# 사전 요구
npm install -g @anthropic-ai/claude-code

# claude-distill
npm install -g claude-distill
claude-distill init
```

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

**Q. 다른 LLM 백엔드?**
A. 현재 `claude` CLI만. v0.3에서 `--backend=api` (`ANTHROPIC_API_KEY` 직접) 추가 예정.

---

## 상태

v0.2 — 자동 누적 모델로 재정비. 실 사용 결과 알려주시면 prompt 튜닝 / 카테고리 조정 진행합니다.

## License

MIT © parksubeom
