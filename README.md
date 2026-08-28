# lirouti_backoffice

리루티 운영 어드민 백오피스.

```bash
bun install
bun run dev       # http://localhost:5173
```

| 스크립트 | 하는 일 |
|---|---|
| `bun run dev` | 개발 서버 |
| `bun run build` | Panda 코드젠 + 타입체크 + 프로덕션 빌드 |
| `bun run typecheck` | Panda 코드젠 + `tsc --noEmit` |
| `bun run test` | Vitest (watch 는 `bun run test:watch`) |
| `bun run lint` | ESLint + 선언 순서 + 디자인 토큰 명암비 + 주석 규약 |
| `bun run assets` | 디자인 원본에서 개별 SVG 파일 + id 타입 생성 |

**패키지 매니저는 bun.** 잠금 파일은 `bun.lock`.

스택은 Vite + React 19 + TypeScript + Panda CSS + react-router + zustand + Recharts.
폴더 구조 · 디자인 토큰 · 라우팅 · 상태 소유권 · 인증은 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** 참고.

## 검사

`bun run lint` 는 넷을 돌린다. 규칙을 문서에만 두면 새어 나가므로 전부 강제한다.

| | 무엇을 |
|---|---|
| ESLint | 레이어 의존 방향(의존은 아래로만) · import 정렬 · `type` 강제 |
| `scripts/check-order.ts` | 파일·컴포넌트 안 선언 순서 |
| `scripts/check-contrast.ts` | 디자인 토큰 명암비 (WCAG AA, 라이트·다크) |
| `scripts/check-comments.ts` | 주석의 자리와 형식 (§17) |

**"왜를 쓴다" 같은 판단은 강제하지 않는다.** 오탐이 생기면 규칙 자체가 죽는다.

## 생성물

두 가지가 커밋되지 않는다 — `bun install` 후 스크립트를 한 번 돌리면 만들어진다.

- `styled-system/` — Panda 코드젠 산출물
- `design/` — 디자인 원본. Claude Design 프로젝트 "리루티" 에서 받아 둔다

⚠️ **`src/assets/icons`·`images` 는 생성물이지만 커밋한다.** 입력(`design/`)과 산출물을 둘 다
빼면 깨끗한 클론에서 빌드가 안 되기 때문이다. 에셋을 다시 뽑아야 할 때만 `design/` 을
받아서 `bun run assets` 를 돌린다. (자세한 내용은 ARCHITECTURE.md §8)
