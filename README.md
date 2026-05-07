# claude-distill

> 클로드 코드 세션에서 판례·사고 보고서를 자동 누적시키는 hook 도구. 한 번 설치하면 더 이상 손 안 댑니다.

## 왜

세션마다 의미있는 trade-off 결정 (`A 대신 B 선택, 이유는…`), 환경 함정 (`Cursor webview에서 confirm() 차단됨`), 같은 실수 (`Claude Code JSONL의 promptId는 항상 null`)이 쌓입니다. 그런데 세션이 끝나면 다 잊혀집니다.

`claude-distill`은 그걸 자동으로 잡아서 markdown에 누적시킵니다. 그리고 다음 세션에 Claude가 자연스럽게 참조합니다.

```
CLAUDE.md       법률  — 모든 세션이 따라야 하는 보편 규칙 (직접 작성)
knowledge.md    판례  — "이 상황엔 이렇게 했다"  (자동 누적)
gotchas.md      사고  — "같은 실수 반복 금지"  (자동 누적)
```

## 설치

```bash
npm install -g @anthropic-ai/claude-code   # 사전 요구 (없으면)
npm install -g claude-distill
claude-distill init
```

`init`이 두 가지를 등록합니다 (idempotent — 중복 등록 X):
1. `~/.claude/settings.json`의 **Stop hook** — 세션 끝날 때마다 자동 분석
2. `~/.claude/CLAUDE.md` 끝에 **`@knowledge.md` / `@gotchas.md`** 참조 — 다음 세션부터 Claude가 자동 참조

끝입니다. 더 이상 손 안 댑니다.

## 어떻게 동작

1. 세션 끝 → Stop hook이 `claude-distill analyze --quiet` 자동 실행
2. 마지막 user marker 이후 turn을 slice → `claude --print`로 분석기에 전달
3. 결과 JSON에서 **`confidence: high`** entry만 markdown에 자동 append
4. medium / low entry는 의도적으로 drop (사용자 손 안 가게)
5. 다음 세션부터 Claude가 `@reference`로 자동 참조

분석기 prompt는 보수적으로 작성됨 — 자명한 사실, project-internal trivia, 검증 안 된 추측은 제외.

## 카테고리

**판례** (knowledge): `trade_off_decision` · `environment_quirk` · `scale_transition` · `tooling_insight` · `performance_insight`

**사고** (gotcha): `api_quirk` · `type_shape` · `concurrency_race` · `build_deploy` · `privacy_security` · `ux_regression`

## 결과 보기

별도 UI 없습니다. **markdown 파일을 IDE에서 직접 열어보시면 됩니다**:

```bash
~/.claude/knowledge.md
~/.claude/gotchas.md
```

마음에 안 드는 entry는 그냥 그 줄 삭제하면 됩니다 (markdown이라 자유 편집).

## 명령

| 명령 | 용도 |
|---|---|
| `claude-distill init` | hook + CLAUDE.md reference 등록 (한 번만) |
| `claude-distill where` | 모든 path / 존재 여부 확인 (디버깅) |
| `claude-distill analyze` | 수동 분석 (보통 hook이 자동 호출) |

`analyze`의 옵션:
- `--no-auto` — 자동 누적 대신 stdout에 JSON 출력 (디버깅)
- `--mock` — claude CLI 호출 없이 fake entry 1건 생성
- `--quiet` — 출력 억제 (hook용)
- `--session=<file>` — 특정 jsonl 직접 지정

## 프로젝트별 누적

전역 누적이 기본. 프로젝트별로 따로 모으고 싶으면 `<project>/.claude/CLAUDE.md`에 직접:
```markdown
@.claude/knowledge.md
@.claude/gotchas.md
```
추가하고, hook 호출 시 `--scope=project` 옵션 사용 (v0.3+).

## 프라이버시

- 모든 추출이 사용자 머신에서 일어남
- transcript 내용은 사용자가 (또는 hook이) 호출할 때만 Claude로 전달
- 결과는 plain markdown — git ignore 규칙 그대로 따름
- hook은 `~/.claude/settings.json`에서 직접 비활성화 가능

## 상태

v0.2. 초기 릴리스. 실 사용 결과 알려주시면 prompt 튜닝/카테고리 조정 진행합니다.

## License

MIT © parksubeom
