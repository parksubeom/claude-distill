<h1 align="center"><img src="./assets/banner.svg" alt="claude-distill" width="100%"></h1>

<p align="center">
  <a href="https://www.npmjs.com/package/claude-distill"><img alt="npm 버전" src="https://img.shields.io/npm/v/claude-distill?style=flat-square&color=4F46E5&label=npm"></a>
  <img alt="Claude Code 훅" src="https://img.shields.io/badge/Claude%20Code-Stop%20hook-4F46E5?style=flat-square">
  <img alt="라이선스: MIT" src="https://img.shields.io/badge/license-MIT-555555?style=flat-square">
</p>

<p align="center">
  <a href="#써-보기">써 보기</a> · <a href="#어떻게-동작하나요">동작 방식</a> · <a href="#개인정보와-보안">개인정보와 보안</a> · <a href="#bumpist-저장소">다른 저장소</a>
</p>

Claude가 대화에서 배운 것을 인수인계 노트에 자동으로 적어 둬요. 다음 대화의 Claude는 그 노트를 읽고 시작해요.

> [!NOTE]
> npm v0.4.1이에요. 자동 기록, 비용을 줄이는 4단 필터, 한국어·영어 자동 기록까지 동작해요.

## 왜 필요한가요

Claude는 매일 새로 출근하는 사람과 같아요. 어제 알려 준 요령을 오늘 또 설명해야 해요.

- **설치 전**: 대화마다 같은 주의할 점을 다시 말해야 해요.
- **설치 후**: 한 번 발견한 주의할 점은 노트에 자동으로 적히고, 다음 대화의 Claude는 이미 알고 시작해요.

할 일은 처음에 한 번 설치하는 것뿐이에요.

## 써 보기

```bash
npm install -g claude-distill
claude-distill init
```

`init`은 두 가지를 등록해요. 여러 번 실행해도 결과는 같아요.

1. 대화가 끝날 때마다 분석을 부르는 설정(`~/.claude/settings.json`의 Stop hook)
2. 다음 대화부터 노트를 읽게 하는 참조 두 줄(`~/.claude/CLAUDE.md` 끝)

> [!IMPORTANT]
> 터미널에서 Claude Code를 쓰면 더 할 일이 없어요. Cursor나 VS Code 확장으로 쓴다면 `ANTHROPIC_API_KEY` 환경변수를 설정해 주세요. 확장 안의 Claude는 밖에서 부를 수 없어서예요.

결과는 `~/.claude/knowledge.md`와 `~/.claude/gotchas.md`를 열어 보면 돼요. 따로 화면은 없어요.

## 어떻게 동작하나요

1. 대화가 끝나면 쓸 만한 교훈이 있었는지 봐요. 대부분은 없어서 조용히 끝나요.
2. 교훈이 있으면 핵심만 뽑아 노트에 더해요.
3. 다음 대화가 시작되면 Claude가 노트를 자동으로 읽어요.

노트는 평범한 마크다운 파일 두 개예요. 마음에 안 드는 내용은 그 줄을 지우면 돼요.

- `CLAUDE.md`: 법률. 사람이 쓰는 변하지 않는 규칙이에요.
- `knowledge.md`: 판례. "이런 상황에선 이렇게 했다"를 claude-distill이 적어요.
- `gotchas.md`: 사고 기록. "같은 실수 반복 금지"를 claude-distill이 적어요.

<details>
<summary>같은 흐름을 그림으로 보기</summary>

```mermaid
flowchart LR
  talk["Claude와 대화"] -- "대화가 끝나면" --> check{"쓸 만한 교훈이<br/>있었나?"}
  check -- "없음 (대부분)" --> stop["조용히 끝<br/>비용 거의 0"]
  check -- "있음" --> extract["핵심만 뽑기"]
  extract --> note["노트에 추가<br/>판례 · 사고 기록"]
  note -. "다음 대화가 시작될 때<br/>자동으로 읽음" .-> next["다음 대화는<br/>이미 아는 상태로 시작"]
```

</details>

<details>
<summary>실제로 쌓인 기록 예시</summary>

직접 쓰면서 자동으로 쌓인 항목이에요(내용은 편집하지 않았어요).

```
gotcha     npm link가 macOS 기본 prefix에서 sudo 없이 실패 — 절대경로로 우회
gotcha     Claude Code JSONL의 promptId가 항상 null — uuid + parentUuid 체인 사용
gotcha     Cursor 빌트인 Claude는 PATH에 `claude` 바이너리를 노출 안 함
knowledge  ffmpeg cropdetect의 limit은 어두운 padding에서 ≥32 필요
knowledge  Transcript를 마지막 user marker부터 slice하면 분석 prompt ~80% 감소
knowledge  CSP `connect-src 'none'`이 webview의 외부 fetch를 이중 차단
```

항목마다 증상, 함정, 원인, 우회 방법 순서로 정리돼요. 당연한 사실, 한 프로젝트 안에서만 의미 있는 내용, 확인되지 않은 추측은 기록하지 않아요.

</details>

<details>
<summary>비용이 거의 들지 않는 이유</summary>

대부분의 대화에는 기록할 교훈이 없다고 보고, 분석 전에 네 번 걸러요.

1. 다른 분석이 만든 대화면 바로 끝내요(무한 반복 방지).
2. 이미 분석한 구간이면 끝내요.
3. 짧거나, 도구를 쓰지 않았거나, 오류 흔적이 없는 대화면 끝내요(무료).
4. API 키가 있으면 Haiku에게 "기록할 게 있나?"만 한 단어로 물어요(사실상 0원).

네 번을 모두 통과한 대화만 실제로 분석해요. 이때 Sonnet 기준으로 대화당 약 $0.10이 들어요.

</details>

## 개인정보와 보안

- 중간 서버가 없어요. 내 컴퓨터에서 Anthropic API로 바로 가고, 제작자에게도 대화 내용이 가지 않아요.
- API 키는 파일에 저장하지 않아요. 환경변수로 넣은 값만 읽어요.
- 코드와 저장소는 건드리지 않아요. 대화 기록은 읽기만 하고, 노트 파일 두 개에만 내용을 더해요.
- 분석 기록에는 내용 대신 12자짜리 지문(해시)만 남겨요. 같은 구간을 두 번 분석하지 않기 위해서예요.

> [!WARNING]
> 대화에 비밀번호나 키를 직접 적은 적이 있다면, 그 내용도 분석 요청에 들어갈 수 있어요. 그런 대화는 분석 전에 `~/.claude/projects/` 안의 해당 기록 파일을 지워 주세요.

## 이런 경우엔 안 맞아요

- 회사 정책상 대화 내용을 외부 API로 보낼 수 없어요. 분석에 Anthropic API를 써요.
- 노트에 무언가 자동으로 쌓이는 게 싫어요. 확신도가 높은 항목만 남기지만, 사람이 검토하기 전에 기록돼요.

<details>
<summary>지금 되는 것과 준비 중인 것</summary>

| 상태 | 내용 |
| --- | --- |
| **지금 (v0.4.1)** | 자동 기록, 4단 필터, 한국어·영어 자동 감지, Claude Code CLI와 API 두 가지 호출 방법 |
| 준비 중 | 프로젝트별 노트(지금은 모든 프로젝트가 같은 노트를 써요) |
| 준비 중 | [bumpist-code](https://github.com/parksubeom/bumpist-code)로 보내는 규칙 제안 내보내기 |
| 계획 없음 | OpenAI나 로컬 모델 지원 |

</details>

<details>
<summary>명령과 설정</summary>

| 명령 | 용도 |
| --- | --- |
| `claude-distill init` | 설치 후 한 번. Stop hook과 노트 참조를 등록해요 |
| `claude-distill where` | 파일 위치와 존재 여부 확인 |
| `claude-distill analyze` | 직접 분석. 보통은 자동으로 돌아서 쓸 일이 없어요 |

`analyze` 옵션: `--no-auto`(노트에 쓰지 않고 결과만 출력), `--mock`(가짜 항목 하나로 동작 확인), `--session=<파일>`, `--quiet`, `--lang=ko|en`, `--no-gate`·`--force`(필터를 건너뛰고 강제 분석)

| 환경변수 | 용도 |
| --- | --- |
| `ANTHROPIC_API_KEY` | API로 분석. 설정하면 Haiku 필터도 켜져요 |
| `CLAUDE_DISTILL_MODEL` | 분석 모델 (기본 `claude-sonnet-4-6`) |
| `CLAUDE_DISTILL_GATE_MODEL` | 필터 모델 (기본 `claude-haiku-4-5-20251001`) |
| `CLAUDE_DISTILL_LANG` | 기록 언어 고정 (`ko` 또는 `en`). 없으면 대화의 한글 비율로 정해요 |

기록되는 항목 종류는 11가지예요. 판례는 `trade_off_decision` `environment_quirk` `scale_transition` `tooling_insight` `performance_insight`, 사고 기록은 `api_quirk` `type_shape` `concurrency_race` `build_deploy` `privacy_security` `ux_regression`이에요.

</details>

<details>
<summary>멈추거나 지우려면</summary>

- **잠시 멈추기:** `~/.claude/settings.json`의 `hooks.Stop`에서 claude-distill 항목만 빼요.
- **완전히 지우기:** `npm uninstall -g claude-distill` 후 `~/.claude/CLAUDE.md` 끝의 `<!-- claude-distill auto-references -->` 블록을 지워요. 노트 두 개는 남기고 싶으면 그대로 두세요.
- **잘못 쌓인 항목:** 노트 파일에서 그 항목의 `###` 블록을 지우면 다음 대화부터 읽지 않아요.

</details>

## Bumpist 저장소

claude-distill은 혼자 써도 완전히 동작해요. 다른 저장소와 연결하면, 대화에서 반복된 함정이 룰북의 새 규칙 후보가 돼요.

| 저장소 | 하는 일 |
| --- | --- |
| [bumpist-design](https://github.com/parksubeom/bumpist-design) | 색만 바꾸면 되는 디자인 시스템 |
| [bumpist-agents](https://github.com/parksubeom/bumpist-agents) | 아이디어에서 미리보기까지 가는 작업 순서 |
| [bumpist-code](https://github.com/parksubeom/bumpist-code) | AI가 같은 방식으로 코드를 쓰게 하는 룰북 |
| [bumpist-ship](https://github.com/parksubeom/bumpist-ship) | 파일 하나로 붙이는 자동 검사 |
| **claude-distill (지금 보는 곳)** | Claude가 배운 것을 자동으로 기록 |

## 라이선스

MIT © parksubeom
