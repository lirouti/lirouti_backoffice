# 리루티 운영 어드민 — 아키텍처 설계

> 상태: **골격 구축 완료** — 셸 + 지표 화면 동작, 나머지 화면은 라우트 + placeholder
> 기준 디자인: Claude Design `리루티` 프로젝트 / `리루티 운영 어드민.dc.html` + `riruti-assets.js`
> 최종 수정: 2026-08-25

```bash
bun install
bun run assets    # design/ → src/assets/ 개별 SVG 생성 (최초 1회 + 원본 갱신 시)
bun run dev       # http://localhost:5173
```

---

## 1. 개요

### 1.1 무엇을 만드는가

리루티(캐릭터 육성 서비스) 운영자용 백오피스 SPA. 디자인 원본은 Claude Design의 `.dc.html` 캔버스 파일로, **셸(레이아웃) + 지표(대시보드) 화면**이 `리루티 운영 어드민.dc.html` 한 파일에 그려져 있고, 나머지 화면은 형제 파일 20여 개(`riruti-admin-items.dc.html`, `riruti-admin-chal.dc.html` …)에 분산되어 있다.

### 1.2 디자인 원본의 구조적 특징 (그대로 옮기면 안 되는 것들)

| 원본 | 문제 | 이 설계에서의 대응 |
|---|---|---|
| 화면 전환 = `location.href = 'riruti-admin-items.dc.html#items'` (파일 이동 + 해시) | 멀티페이지 하드 내비게이션. 상태 전부 소실 | **react-router 클라이언트 라우팅**. `FILEOF` 맵은 폐기하고 URL 경로로 대체 |
| 화면 전체가 `sc-if`로 한 파일에 나열 (`sDash`, `sItems`, `sItem` …) | 파일 하나가 수천 줄 | **route 단위 코드 스플리팅** (`React.lazy`) |
| 목록 필터(`slot`/`tier`/`q`/`page`/`view`)가 컴포넌트 state | 새로고침·뒤로가기·URL 공유 불가 | **`useSearchParams`** 로 이동 |
| 모든 스타일이 인라인 `style="..."` 문자열 + `style-hover` 커스텀 속성 | 재사용·다크모드·상태 스타일 관리 불가 | **Panda CSS 레시피** (`variants`로 tone/size/state) |
| 색상이 `var(--pri)` 등 **43개 CSS 변수** 2세트(light/dark) | 그 자체는 훌륭함 — 유지 | **Panda `semanticTokens`로 1:1 이관** (§3) |
| 더미 데이터가 `build()` 안의 시드 RNG로 생성 | 그 자체는 훌륭함 — 결정적(deterministic) | **`src/mocks/`로 이관**, API 파사드 뒤에 배치 (§7) |
| 282KB SVG 스프라이트를 `window.RIRUTI_LIB` 문자열로 주입 | 통째로 받아야 하고 메인 번들 오염 | **개별 파일로 분해** — 아이콘은 컴포넌트, 에셋은 `<img>` (§8) |

---

## 2. 기술 스택 & 디펜던시

### 2.1 확정 스택

```text
Vite 8  +  React 19  +  TypeScript 6  +  Panda CSS 1  +  react-router 8
```

### 2.2 dependencies (런타임)

| 패키지 | 버전 | 왜 |
|---|---|---|
| `react` | `^19.2.8` | — |
| `react-dom` | `^19.2.8` | — |
| `react-router` | `^8.3.0` | SPA 라우팅. v7부터 `react-router-dom`이 아니라 **`react-router`** 단일 패키지. `createBrowserRouter` 기반 **Data Router**(`<BrowserRouter>`+`<Routes>` 의 Declarative 모드가 아니다) |
| `axios` | `^1.19.0` | HTTP. 응답 있음/네트워크 끊김/타임아웃/취소를 `ApiError` 하나로 정규화한다 (§7) |
| `@tanstack/react-query` | `^5.102.4` | 서버 상태 캐시. keep-alive 와 맞물리는 지점은 §7 |
| `react-hook-form` | `^7.86.0` | 폼 상태·검증·`isDirty`. 미저장 경고가 이걸 쓴다 (§18.7). 첫 로드 예산 밖 — 폼 화면 청크에만 들어간다 |
| `keepalive-for-react` | `^5.0.11` | 탭 전환 시 화면을 언마운트하지 않는다. DOM 에서 분리(detach)라 `display:none` 보다 낫다 |
| `zustand` | `^5.0.15` | 테마 / 열린 탭 / 사이드바 펼침 / 뷰어(권한) — **localStorage에 붙는 전역 UI 상태**만 담당. `persist` 미들웨어가 원본의 `lsGet/lsSet`을 그대로 대체 |
| `recharts` | `^3.10.1` | 차트. **SVG 렌더링**이라 `var(--colors-*)`를 그대로 먹어서 다크 모드가 리렌더 없이 따라온다 (§9.1) |
| `qrcode.react` | `^4.2.0` | TOTP 등록 QR (§16.3). `QRCodeSVG` 로 **SVG** 를 그린다 — 확대·인쇄해도 뭉개지지 않고, canvas 와 달리 스캐너가 읽을 픽셀을 브라우저가 알아서 맞춘다. `SecurityPage` 청크에만 들어간다(gzip 약 10KB, 첫 로드에 없음) |

패키지 매니저는 **bun** (`bun install` / `bun run …`). 잠금 파일은 `bun.lock`.

> **의도적으로 넣지 않은 것**
> - **canvas 기반 차트(Chart.js / ECharts)** — 우리 색은 전부 CSS 변수라, canvas 는 `var(--colors-pri)`를 해석하지 못해 테마 토글마다 `getComputedStyle`로 읽어 강제 리렌더해야 한다. SVG 기반인 Recharts 를 쓴다.
> - **UI 킷(MUI/Chakra/shadcn)** — 디자인 시스템이 이미 완성되어 있다. 킷을 얹으면 override 비용만 생긴다.

### 2.3 devDependencies

| 패키지 | 버전 | 왜 |
|---|---|---|
| `vite` | `^8.2.2` | — |
| `@vitejs/plugin-react-swc` | `^4.3.3` | Babel 대신 SWC. HMR 체감 차이가 크다 |
| `typescript` | `6.0.3` (고정) | 아래 참고 — TS 7은 typescript-eslint 미지원 |
| `@types/react` | `^19.2.18` | — |
| `@types/react-dom` | `^19.2.4` | — |
| `@pandacss/dev` | `^1.12.0` | `panda` CLI + PostCSS 플러그인 + `styled-system` 코드젠 |
| `postcss` | `^8.5.26` | Panda가 PostCSS 플러그인으로 동작 |
| `eslint` `^10.9.0` · `@eslint/js` · `globals` · `typescript-eslint` `^8.67.0` · `eslint-plugin-react-hooks` `^7.1.1` · `eslint-plugin-react-refresh` `^0.5.4` | | flat config |
| `eslint-plugin-perfectionist` | `^5.10.1` | import 정렬을 레이어 순서로 강제 (§15). `--fix` 자동 |
| `vite-plugin-svgr` | `^5.2.0` | `?react` 로 SVG 를 컴포넌트화 (§8.4). 아이콘이 `currentColor` 를 물려받으려면 필요 |
| `vitest` | `^4.1.11` | Vite 위에서 도는 테스트 러너. 설정을 `vite.config.ts` 가 겸한다 (§14) |
| `prettier` | `^3.9.6` | — |

**설치 중 확인된 것 세 가지**

- `vite-tsconfig-paths`는 **넣었다가 뺐다.** Vite 8이 tsconfig paths 해석을 네이티브로 지원하며 빌드 중 직접 안내한다. `vite.config.ts`에 `resolve: { tsconfigPaths: true }` 한 줄이면 된다.
- **TypeScript는 6.0.3으로 고정했다.** 처음엔 최신인 7.0.2(네이티브 포팅 버전)를 넣었는데 `typescript-eslint`가 아직 TS 7을 지원하지 않아 ESLint가 아예 뜨지 않는다. TS 7은 타입체크만 되고 린트가 죽는 상태라, 툴체인 전체가 맞물리는 6.x를 택했다. typescript-eslint의 TS ≥7.1 지원(이슈 #10940)이 들어오면 올린다.
- TS 7에서는 **`baseUrl`이 제거**됐다(TS5102). 6.x는 아직 지원하지만, 나중에 올릴 때 걸리지 않도록 지금부터 `paths`만 쓰고 `./` 로 시작하는 상대 경로로 적는다.

### 2.4 화면이 늘어날 때 추가 (2단계)

지금 스코프(셸 + 지표)에는 불필요하지만, 아래 화면에 착수하는 시점에 넣는다. **미리 설치하지 않는다.**

| 패키지 | 버전 | 도입 시점 |
|---|---|---|
| `@tanstack/react-table` | `^9.1.2` | 아이템/챌린지/결제/감사로그 등 **정렬·페이지네이션 있는 목록** 착수 시. 목록 화면이 10개 이상이라 결국 필요 |
| `zod` | `^4.4.3` | 위 폼의 검증 + API 응답 파싱 |
| `date-fns` | `^4.4.0` | 기간 설정 / 예약 발행 등 날짜 연산이 실제로 생길 때. 단순 포맷만이면 `Intl.DateTimeFormat`으로 충분하니 넣지 않는다 |
| `@testing-library/react` `^16.3.2` + `@testing-library/dom` `^10.0.0` + `jsdom` `^30.0.1` | 위 버전 | **컴포넌트** 테스트를 시작할 때. `vitest` 는 이미 들어와 `domain/` 순수 함수를 덮고 있다. 켤 때는 `vite.config.ts` 의 `test.include` 에 `'src/**/*.test.tsx'` 를 더하고 `test.environment` 를 `'jsdom'` 으로 바꾼다 — 지금 `.test.ts` 만 잡는 건 실수가 아니라 **그 결정을 하기 전까지 순수 함수 테스트만 존재하게 하는 경계**다. `@testing-library/dom` 은 v16 부터 peer 로 빠져서 **직접 설치해야 한다** |

---

## 3. 디자인 토큰 (Panda `semanticTokens`)

### 3.1 네이밍 정책 — **원본 변수명을 그대로 토큰 키로 쓴다**

`--pri` → `colors.pri`, `--gBg` → `colors.gBg`. 읽기 좋은 이름(`brand.solid`, `success.bg`)으로 바꾸고 싶은 유혹이 있지만 **바꾸지 않는다.**

이유: 아직 포팅하지 않은 디자인 파일이 20개 넘게 남아 있고, 그 파일들은 전부 `var(--gBg)` 문자열을 쓴다. 키를 유지하면 포팅이 기계적인 치환(`var(--X)` → `token(colors.X)`)이 되지만, 이름을 바꾸면 매번 대조표를 봐야 한다. 디자인이 원본(source of truth)이므로 코드가 디자인의 어휘를 따른다.

대신 아래 표의 **역할** 열을 `panda.config.ts`에 주석으로 함께 남겨 가독성을 확보한다.

### 3.2 토큰 표 (45개)

**표면 / 구조**

| 토큰 | light | dark | 역할 |
|---|---|---|---|
| `page` | `#F7F8FA` | `#12161C` | 페이지 바탕 |
| `surf` | `#ffffff` | `#191E26` | 카드·사이드바·헤더 표면 |
| `surf2` | `#FAFBFC` | `#1E242D` | 한 단 낮은 표면 (검색 인풋 등) |
| `band` | `rgba(255,255,255,.94)` | `rgba(25,30,38,.94)` | 스티키 헤더 배경 (backdrop-blur 동반) |
| `hov` | `#F4F7FC` | `#212936` | 버튼/행 hover |
| `prev` | `#F3F7FD` | `#171C24` | 에셋 썸네일 배경 |
| `prev2` | `#F7F9FC` | `#161A21` | 활성 탭 배경 / 행 hover |

**경계선**

| 토큰 | light | dark | 역할 |
|---|---|---|---|
| `bd` | `#E4E7EB` | `#2C323C` | 기본 보더 |
| `ln` | `#EFF1F4` | `#232932` | 약한 구분선 · 차트 그리드 |
| `grid` | `#EFF2F6` | `#232932` | 프로그레스 트랙 배경 |
| `track` | `#D3D9E2` | `#3A4150` | 스위치 off 트랙 |
| `liveBd` | `#D6E4FA` | `#274063` | "라이브" 배지 보더 |
| `ringBd` | `#2F7CEF` | `#5B9BFF` | 포커스 링 보더 |
| `ring` | `rgba(47,124,239,.18)` | `rgba(91,155,255,.24)` | 포커스 링 그림자 (`0 0 0 3px`) |

**텍스트 (명도 4단계)**

| 토큰 | light | dark | 역할 |
|---|---|---|---|
| `ink` | `#16191E` | `#E7EAEF` | 본문 / 제목 |
| `sub` | `#6B717C` | `#9AA1AD` | 보조 설명 |
| `faint` | `#8B919C` | `#7B8290` | 캡션 · 플레이스홀더 |
| `faint2` | `#A8AEB8` | `#666D79` | 아이콘 · 구분자 chevron |

**브랜드**

| 토큰 | light | dark | 역할 |
|---|---|---|---|
| `pri` | `#2F7CEF` | `#5B9BFF` | 주 액션 · 활성 아이콘 · 차트 1계열 |
| `priD` | `#1B5FD6` | `#93BEFF` | 주 액션 hover · 활성 텍스트 |
| `soft` | `#EAF2FE` | `#1C2C46` | 활성 내비 배경 · 차트 영역 채움 |
| `chart` | `#B9D3F8` | `#2E5691` | 차트 2계열 (소비 바) |
| `onPri` | `#ffffff` | `#0E1420` | `pri` 위 텍스트 |

**상태 (fg/bg 쌍)** — 배지·칩·상태 표시에 쓰이는 6쌍

| 쌍 | fg (light/dark) | bg (light/dark) | 쓰임 |
|---|---|---|---|
| `gFg`/`gBg` | `#1F9D6B` / `#43C68D` | `#E6F6EF` / `#16302A` | 성공 · 노출중 · 진행 · 상승 |
| `aFg`/`aBg` | `#8A6314` / `#E0A63C` | `#FDF3E2` / `#33290F` | 주의 · 예약 · 검수중 |
| `rFg`/`rBg`/`rBd` | `#D64550` / `#F4707B` | `#FCEDEE` / `#3A2126` (`rBd` `#F3C9CD`/`#5A2E35`) | 위험 · 회수 · 하락 |
| `pFg`/`pBg` | `#7C5CD6` / `#A98FF0` | `#F1ECFD` / `#282141` | 주간 챌린지 |
| `nFg`/`nBg` | `#71777F` / `#98A0AC` | `#F2F4F7` / `#252A34` | 중립 · 종료 · 미노출 |
| `tFg`/`tBg` | `#0E8C7F` / `#3FC0B2` | `#E3F6F3` / `#12302E` | 시즌 챌린지 |
| `goldFg`/`goldBg` | `#8A6A18` / `#E8C374` | `#FBF1D6` / `#3A2F12` | **유료 등급** 표시 |
| `warnFg`/`warnBd` | `#8A6314` / `#E8C374` | `#F5DFB4` / `#4A3A16` | 운영자 미리보기 배너 |

**기타**

| 토큰 | light | dark | 역할 |
|---|---|---|---|
| `dot` | `#22A06B` | `#34C98A` | 라이브 상태 점 |
| `avB`/`avF` | `#DCE6F6` / `#22314A` | `#2A5FA8` / `#A9C7F5` | 아바타 배경/글자 |
| `tilePaid` | `#14122B` | `#14122B` | 유료 아이템 타일 배경 (양쪽 동일) |
| `onDanger` | `#ffffff` | `#2A1013` | 위험 버튼 위 텍스트 |

### 3.3 다크 모드 조건

원본은 `:root[data-theme="dark"]`로 전환한다. Panda 기본 `_dark` 조건은 클래스(`.dark &`) 기준이므로 **조건을 덮어써서** 원본 방식을 유지한다.

```ts
// panda.config.ts
conditions: {
  extend: {
    dark:  '[data-theme="dark"] &',
    light: '[data-theme="light"] &, &',
  },
},
theme: {
  extend: {
    semanticTokens: {
      colors: {
        page: { value: { base: '#F7F8FA', _dark: '#12161C' } },
        surf: { value: { base: '#ffffff', _dark: '#191E26' } },
        // … 43개
      },
    },
  },
},
```

v1 타입 정의(`@pandacss/types`)에서 `conditions.extend` · `theme.semanticTokens` · `globalCss` · `jsxFramework` 형태를 확인했다. v0.x와 동일하다.

> ⚠️ **`panda init`이 만든 `panda.config.mjs`는 지워야 한다.** `.mjs`가 남아 있으면 `.ts` 설정이 통째로 무시되고 기본 프리셋만 코드젠된다 (토큰이 하나도 안 나와서 한참 헤맬 수 있다).

**토큰 키 → CSS 변수 이름은 kebab-case로 바뀐다.** `priD` → `--colors-pri-d`, `gBg` → `--colors-g-bg`. 그래서 SVG 속성처럼 Panda가 처리하지 않는 자리에는 `var(--colors-…)`를 손으로 쓰지 말고 런타임 헬퍼를 쓴다:

```tsx
import { token } from 'styled-system/tokens'
<polyline stroke={token('colors.pri')} />
```

`css({ … })` 안의 문자열에서는 `'1px solid token(colors.bd)'` 형태가 그대로 동작한다.

### 3.4 그 외 토큰

- **폰트**: Pretendard Variable (jsDelivr CDN). `fontFamily.sans = "Pretendard, -apple-system, 'Apple SD Gothic Neo', system-ui, sans-serif"`
  - 원본은 CDN `<link>`. **폰트를 `public/`에 self-host 하는 것을 권장** — 어드민은 사내망/폐쇄망에서 열릴 수 있고, CDN 실패 시 한글 폰트가 통째로 깨진다.
- **radius**: `6·7·8·9·12` 5단계 → `radii.xs/sm/md/lg/xl`
- **letterSpacing**: 한글 가독성을 위해 `-0.3px` ~ `-0.9px`가 폰트 크기별로 붙어 있다 → **텍스트 스타일(`textStyles`)로 묶는다.** 개별 컴포넌트에서 매번 `letterSpacing`을 쓰지 않게.

| textStyle | size / line / tracking | 쓰임 |
|---|---|---|
| `display` | 24 / 31 / -0.9 | KPI 숫자 |
| `h2` | 19 / 27 / -0.5 | 화면 제목 |
| `h3` | 14 / — / -0.4 | 카드 제목 |
| `body` | 13 / 19 / -0.35 | 본문 · 내비 |
| `label` | 12 / 17 / -0.3 | 라벨 · 브레드크럼 · 탭 |
| `caption` | 11.5 / 16 / -0.3 | 캡션 |
| `micro` | 11 / 15 / -0.3 | 배지 · 카운트 |

- **전역 CSS**: `body { word-break: keep-all; overflow-wrap: anywhere }` — 한글 줄바꿈 처리. Panda `globalCss`로.

---

### 3.5.1 ⚠️ 틴트 표면은 쓸 수 있는 글자색이 더 적다

`page`·`surf`·`surf2` 는 중립 표면이라 텍스트 세 단계가 다 얹힌다. **`soft` 는 아니다.**

| | `surf` | `soft` |
|---|---|---|
| `ink` | 17.62 ✓ | 15.63 ✓ |
| `sub` | 7.50 ✓ | 6.66 ✓ |
| `faint` | 4.91 ✓ | **4.35 ✗** |
| `faint2` | 3.34 ✓ | **2.96 ✗** |

`pri` 가 밝은 배경에서 4.35:1 밖에 안 나와 `priD` 를 따로 둔 것과 **같은 숫자, 같은 상황**이다. `soft` 위에서는 `sub` 까지만 쓴다 — 운영자 말풍선, 선택된 세그먼트·행이 이 표면이다.

**`check-contrast.ts` 가 막는다.** `SURFACES` 에 `soft` 를 그냥 넣으면 `faint` 자체가 위반으로 잡히는데, `faint` 는 중립 표면에서 멀쩡하므로 그건 틀린 진단이다. 대신 **표면별 허용/금지 목록**을 둔다.

```ts
const TINTED = [{ surface: 'soft', allow: ['ink', 'sub'], deny: ['faint', 'faint2'] }]
```

⚠️ **금지한 색이 정말로 못 쓰는 색인지도 확인한다.** 기준을 넘는데 막아 두면 근거 없는 금지가 굳는다 — 검사가 「막아 뒀는데 통과한다」 고 말한다.

> 이 규칙은 Lighthouse 로 먼저 찾았다(문의 상세 96점). **토큰 검사가 못 보던 조합**이라, 찾은 다음 검사에 넣어 아직 안 만든 화면까지 막았다.

## 4. 폴더 구조

### 4.1 아키텍처 방식

**레이어드 + 기능별 수직 분할.** 수평 레이어(`shared` · `domain` · `stores` · `api`) 위에 화면 단위 수직 슬라이스(`features/*`)를 얹는다. React 진영의 feature-folder 관례(bulletproof-react 계열)에 도메인 층을 하나 더한 형태다.

> **Feature-Sliced Design(FSD)이 아니다.** FSD의 "feature"는 *사용자 행동*이고 6개 층(`app/pages/widgets/features/entities/shared`)을 요구한다. 여기 `features/`는 **화면(page)** 단위고 `widgets` 층이 없다. `domain/`이 FSD의 `entities`에 가장 가깝다.

### 4.2 현재 트리

```text
lirouti_backoffice/
├─ design/                        # 디자인 원본 — **gitignore.** Claude Design 에서 받아 둔다 (§8)
├─ docs/ARCHITECTURE.md
├─ scripts/
│  ├─ build-assets.ts             # design/ → src/assets/
│  └─ check-order.ts              # 컴포넌트 안 선언 순서 검사 (§14.4)
└─ src/
   ├─ main.tsx                    # 핸들러 주입(401 · 로그아웃) + 렌더
   ├─ assets/                     # `bun run assets` 생성물 — brand/ 만 예외
   │  ├─ brand/logo.png           #   손으로 두고 커밋한다 (§8.3)
   │  ├─ icons/                   #   ic_* 15개 + index.ts (ICONS · IconId)
   │  └─ images/                  #   as_*/rg*/nst* 50개 + index.ts (IMAGES · AssetId)
   ├─ app/                        # 조립 지점. 위쪽 층을 전부 import 하는 유일한 곳
   │  ├─ router.tsx               #   45개 화면 라우트 + lazy 등록
   │  └─ RequireAuth.tsx          #   미인증 차단 + 원래 목적지 기억 (§16.1)
   ├─ layouts/
   │  └─ AdminLayout/             # 어드민 셸 — `<Outlet/>` 바깥
   │     ├─ index.ts              #   배럴. AdminLayout 만 공개(부품은 비공개)
   │     ├─ AdminLayout.tsx  Sidebar.tsx  Topbar.tsx
   │     ├─ Breadcrumbs.tsx  TabBar.tsx  ViewerBanner.tsx
   │     └─ useScopedNav.ts       #   React 결합부만 (규칙은 domain/access)
   ├─ features/
   │  ├─ auth/                    # LoginPage · TotpStep · BrandPanel · Field
   │  ├─ dashboard/               # DashboardPage · TopItemsCard · LiveChallengesCard
   │  ├─ security/                # SecurityPage · TotpCard · EnrollWizard
   │  │                           # · BackupCodesPanel · CopyButton (§16.3)
   │  └─ PlaceholderPage.tsx      # 미구현 43개 화면이 공유 — 특정 화면 소유가 아니라 평평하다
   ├─ entities/                   # 도메인 타입을 받는 공용 UI (§4.4.2)
   │  └─ asset/                   # AssetPicker — 아이템 폼과 업적 폼이 함께 쓴다
   ├─ stores/                     # localStorage 에 붙는 전역 UI 상태
   │  └─ theme · tabs · nav · viewer · dirty
   ├─ api/
   │  ├─ core/                    # 인프라 — client(axios) · keys · queryClient · index
   │  ├─ error.ts                 #   ApiError — 화면도 쓰는 공개 표면 (core 밖에 두는 이유는 §7.1)
   │  └─ auth.ts · dashboard.ts · security.ts   # ── 여기부터 도메인 파사드
   ├─ mocks/                      # 현재의 데이터 구현체 (시드 RNG · Math.random 금지)
   │  └─ assetTable · items · challenges · dashboard · security
   ├─ domain/                     # 도메인 규칙 + 엔티티 타입 (React 없음)
   │  ├─ item/                    # ── 엔티티는 폴더
   │  │  ├─ types.ts              #    Item · Slot · Tier · ItemStatus · ItemSource
   │  │  ├─ rules.ts              #    topSelling · filterItems · isOnSale
   │  │  ├─ labels.ts             #    코드값 → 한글 + 배지 tone
   │  │  └─ index.ts              #    배럴 (바깥에서만 사용)
   │  ├─ challenge/               #    types · rules · labels · index
   │  ├─ screens.ts               # ── 횡단 관심사는 파일
   │  ├─ nav.ts                   #    NAV 15그룹 · groupOf
   │  ├─ access.ts                #    인가 — Viewer · canAccess · visibleNav · firstScreen
   │  ├─ totp.ts                  #    인증 수단 — otpauthUri · validateTotpCode (§16.2)
   │  └─ dashboard.ts             #    Kpi · SeriesPoint (타입만)
   └─ shared/                     # 도메인을 모르는 재사용 조각
      ├─ ui/                      # Button · Card · Badge · StatCard · Icon
      │  ├─ AssetThumb.tsx  ProgressBar.tsx
      │  ├─ Checkbox.tsx  ErrorBanner.tsx  OtpInput.tsx   # features/auth 에서 승격 (§4.4)
      │  ├─ tone.ts               # BadgeTone — 색조 어휘 (React 없는 순수 .ts)
      │  └─ chart/                # LineChart · BarChart (Recharts, §9.1)
      └─ lib/                     # rng · format
```

> **테스트는 `domain/` 옆에 같은 폴더로 둔다** (`screens.test.ts` · `access.test.ts` · `totp.test.ts`).
> `domain` 안이므로 배럴이 아니라 상대 경로로 import 한다 (§4.4.1 규칙 그대로).
> `test.include` 가 `.test.ts` 만 잡으므로 컴포넌트 테스트는 아직 존재할 수 없다 — 의도된 경계다.

### 4.3 의존 방향

측정 결과(import 전수 스캔). **아래로만 흐르고 순환이 없다.**

```text
        main.tsx
           ↓
        app/router.tsx        ← 조립만. 유일하게 features 를 안다
        ↙        ↘
   layouts      features
        ↓          ↓
     stores       api ──→ mocks
        ↓          ↓        ↓
        └──── domain ←──────┘
                 ↓
              shared
                 ↓
              assets
```

규칙 세 가지:

1. **`shared/`는 도메인을 모른다.** `shared/ui` 컴포넌트가 `Item`·`Kpi` 같은 도메인 타입을 prop 으로 받으면 안 된다. 필요한 모양을 자기 prop 계약으로 선언하면 구조적 타이핑으로 호환된다.
   ```tsx
   // ✗ shared → domain 이 생겨 순환이 된다
   export function StatCard(props: Kpi) {}
   // ✓ 자기 계약. Kpi 를 그대로 넘길 수 있다
   interface StatCardProps { label: string; value: string; … }
   ```
2. **`domain/`에 React 가 없다.** 훅·컴포넌트·zustand 가 들어가면 안 된다. 순수 함수와 타입만.
3. **`features/*`끼리 서로 import 하지 않는다.** 공유가 필요하면 `domain/`·`shared/`·`api/`로 올린다.

### 4.4 어떤 파일을 어디에 두는가

| 폴더 | 들어오는 것 | 들어오면 안 되는 것 |
|---|---|---|
| `app/` | 라우터 조립. **`router.tsx` 하나** | 그 외 전부. 데이터 정책도 아니다 — `queryClient` 는 `api/core/` 로 보냈다 |
| `domain/` | 엔티티 타입, 도메인 규칙, 라벨 매핑, 화면·내비 레지스트리 | React·훅·컴포넌트, zustand, styled-system, 데이터 fetch |
| `layouts/` | **`<Outlet/>` 바깥** — 화면이 바뀌어도 남는 틀 | 특정 화면 전용 UI, 데이터 호출. "여러 화면이 쓴다"는 여기 기준이 아니다 |
| `features/<name>/` | 그 화면의 페이지 + 그 화면에서만 쓰는 컴포넌트·훅 | 다른 feature, `mocks/` 직접 참조 |
| `stores/` | localStorage 에 붙는 전역 UI 상태 | 도메인 규칙(→ `domain/`), 데이터 호출(→ `api/`), 서버 데이터 캐시 |
| `api/` | 화면이 부르는 데이터 함수. **항상 `Promise` 반환** | 화면·상태 참조, 컴포넌트 |
| `mocks/` | 시드 RNG 기반 더미 데이터 **생성** | 정렬·필터 같은 조회 규칙(→ `domain/`) |
| `shared/ui/` | 도메인을 모르는 표현 컴포넌트 | 도메인 타입 prop, 데이터 호출 |
| `shared/lib/` | 도메인을 모르는 순수 유틸 | 도메인 지식(→ `domain/`), 컴포넌트 참조 |
| `assets/` | (자동 생성) | 손으로 작성한 것 무엇이든 |

**판단이 갈리는 두 지점**

- **`shared/ui` vs `features/<name>/`** — 기본은 feature 안이다. **두 번째 feature 가 같은 걸 필요로 할 때** `shared/ui` 로 올린다. 한 곳에서만 쓰는데 미리 올리면 도메인 지식이 새어 들어와 결국 `shared` 가 오염된다.
- **`shared/lib` vs `domain/`** — "리루티를 몰라도 말이 되는가"로 가른다. `format.ts`(숫자 천단위)·`rng.ts`(시드 난수)는 어느 프로젝트에나 있을 법하니 `shared/lib`. `labels.ts`(노출/예약/미노출)는 리루티를 알아야 하니 `domain/`.

### 4.4.1 `domain/` 내부 나누기

**엔티티는 폴더, 횡단 관심사는 파일.**

```text
domain/item/          ← 규칙과 라벨이 붙는 진짜 엔티티
  types.ts   Item · Slot · Tier · ItemStatus · ItemSource
  rules.ts   topSelling · filterItems · isOnSale
  labels.ts  SLOT_LABEL · ITEM_STATUS_TONE …
  index.ts   배럴
domain/access.ts      ← 여러 엔티티를 가로지름 (권한)
domain/screens.ts     ← 엔티티 아님 (화면 레지스트리)
domain/dashboard.ts   ← 타입만 있음. 폴더 불필요
```

**모든 걸 폴더로 만들지 않는다.** 20줄짜리에 폴더를 씌우면 탐색만 번거로워진다.

역할별 파일 이름은 `types` / `rules` / `labels` 로 **고정**한다. 자리가 정해져 있으면 새 코드를 어디 넣을지 고민이 없다. zod 스키마가 붙으면 `schema.ts` 가 추가된다.

> **왜 이렇게 했나** — 원래 `domain/labels.ts` 하나에 item 4종 + challenge 2종 라벨이 섞여 있었다. 엔티티가 아니라 *종류*로 자른 파일이라, 회원·결제·쿠폰·업적이 들어오면 300줄 잡탕이 된다. 화면 41개에 엔티티가 15개는 나올 구조라 3개일 때 정리했다.

**배럴은 바깥에서만 쓴다.**

```ts
// features/, api/, mocks/ 에서
import { SLOT_LABEL, type Item } from '@/domain/item'   // ✓ 배럴

// domain/ 내부에서
import type { Slot } from '../item/types'                // ✓ 파일 직접
import type { Slot } from '@/domain/item'                // ✗ 순환 위험 — ESLint 가 막는다
```

### 4.4.2 도메인을 아는 공용 UI는 어디로 (`entities/`)

`shared/ui` 는 도메인을 모르고(`Item` 을 prop 으로 못 받고), `layouts/` 는 셸이고, `features/*` 끼리는 서로 못 본다. 그러면 **`Item` 을 받아 그리는 공용 컴포넌트**(`ItemTile`, `StatusBadge` 등)는 갈 곳이 없다.

그 자리가 `src/entities/` 다.

```text
domain/item/           Item 타입 + 규칙        (React 없음)
entities/item/         Item 을 그리는 공용 UI   (React 있음, 도메인 앎)
features/items/        화면
```

의존 방향: `features` → `entities` → `api` → `domain` + `shared`

⚠️ **`entities` 는 `stores` 를 못 본다.** 전역 상태를 아는 순간 그 화면 전용이 되어 `features` 안에 두는 게 맞아진다. `mocks` 와 `api/core` 도 `features` 와 같은 이유로 막힌다.

**업적 화면을 만들면서 실제로 생겼다** (§40.4). 첫 입주자는 `entities/asset/AssetPicker` — `features/items` 안에 있던 것을 업적 폼이 **두 번째로 쓰게 되면서** 올렸다. §4.4 의 "두 번째 feature 가 쓸 때 올린다" 가 그대로 적용된 사례다.

`AssetKind` 라는 도메인 타입을 prop 으로 받으므로 **`shared/ui` 로는 갈 수 없었다** — 그 방향은 `shared ⇄ domain` 순환을 만들고, 이 저장소가 실제로 한 번 겪은 사고다(§4.3).

### 4.5 새 화면 하나 추가하기

순서대로 하면 라우팅·내비·탭·브레드크럼·권한이 전부 따라온다.

1. **`domain/screens.ts`** — 항목 추가. 상세 화면이면 `section` 에 부모 목록 화면 id 를 적는다 (그래야 탭이 따로 안 열린다).
2. **`domain/nav.ts`** — 사이드바에 노출할 화면이면 해당 그룹의 `children` 에 추가. 상세 화면은 넣지 않는다.
3. **`domain/<entity>.ts`** — 그 화면이 쓸 타입·규칙. 이미 있으면 생략.
4. **`mocks/<entity>.ts`** → **`api/<entity>.ts`** — 데이터 생성기와 파사드.
5. **`features/<name>/<Name>Page.tsx`** — `export default` 로 내보낸다 (lazy import 대상).
6. **`app/router.tsx`** 의 `IMPLEMENTED` 에 한 줄 등록. 등록하지 않으면 자동으로 placeholder 가 뜬다.

`SCREENS` 에만 넣고 3~6을 안 해도 **화면은 뜬다** — placeholder 로. 라우트·탭·브레드크럼이 먼저 살아 있으니 화면 구현은 나중에 채워도 된다.

### 4.6 경계는 ESLint 로 강제한다

규칙이 문서에만 있으면 반드시 새어 나간다. 실제로 이 프로젝트에서도 `shared/ui` 가 도메인 타입을 prop 으로 받으면서 `shared ⇄ domain` 순환이 한 번 생겼다가 잡혔다.

`eslint.config.js` 의 `FORBIDDEN` 표가 §4.3 의 그림을 그대로 옮긴 것이고, 위반하면 **왜 안 되는지와 어디로 옮기라는 안내**가 함께 나온다.

```text
error  '@/mocks/items' import is restricted from being used by a pattern.
       화면은 mocks 를 직접 보지 않습니다. api 파사드를 거치세요
       — 서버로 갈아탈 때 화면을 손대지 않기 위한 경계입니다.
```

`domain/` 에는 추가로 `react` · `react-router` · `zustand` · `styled-system` import 를 막아 순수성을 지킨다.

타입 선언 규약(`interface` vs `type`)도 같은 파일에서 강제한다 — §13.

### 4.7 왜 `domain/`을 따로 두는가

초기에는 이 층이 없어서 도메인 규칙이 흩어져 있었다.

| 규칙 | 원래 위치 | 문제 |
|---|---|---|
| `canAccess` 권한 판정 | `stores/viewerStore.ts` | 스토어를 바꾸면 권한 규칙이 딸려 감 |
| `topSelling` 정렬 | `mocks/items.ts` | 목을 걷어내면 규칙도 같이 사라짐 |
| `activeChallenges` 필터 | `mocks/challenges.ts` | 위와 동일 |
| `sectionOf` · `groupOf` | `app/screens.ts` · `app/nav.ts` | 데이터 정의 파일에 로직 혼재 |
| `groupOfScreen` | `layouts/…/useScopedNav.ts` | 순수 함수가 훅 파일에 섞임 |

**로직이 데이터·상태·훅 파일의 수명에 종속**되는 게 핵심 문제였다. `domain/`은 아무것도 참조하지 않는 층이라 이런 종속이 생기지 않고, 테스트를 붙이기에도 가장 쉽다.

부수 효과로 `app/`의 성격 혼재도 풀렸다. 전에는 `router.tsx`(최상층)와 `screens.ts`(모두가 참조하는 최하층 레지스트리)가 한 폴더에 있어서 `layouts`가 `app`을 참조하는 역방향 간선이 8건 있었다. 레지스트리를 `domain/`으로 내리면서 사라졌다.

---

## 5. 라우팅

### 5.1 원본 → URL 매핑

원본은 `FILEOF`(화면id → 파일명) + `SCRL`(화면id → 한글 라벨) 두 맵으로 굴러간다. `FILEOF`는 폐기하고, `SCRL`은 **브레드크럼/탭 라벨 소스**로 살린다.

| 그룹 (scope) | 화면 id | URL | 라벨 |
|---|---|---|---|
| `dash` | `dash` | `/dashboard` | 지표 |
| `user` | `users` / `user` | `/users` · `/users/:userId` | 회원 목록 / 회원 상세 |
| `mod` | `mod` / `ai` | `/moderation/reports` · `/moderation/ai` | 신고 처리 / AI 심사 |
| `char` | `rig` / `growth` / `species` / `speciesdet` | `/characters/rig` · `/growth` · `/species` · `/species/:id` | 리그·슬롯 / 성장 단계 / 캐릭터 종류 / 종 상세 |
| `items` | `items` / `itemnew` / `item` | `/items` · `/items/new` · `/items/:itemId` | 아이템 목록 / 등록 / 상세 |
| `bg` | `bg` / `nest` | `/backgrounds` · `/nests` | 배경 / 둥지 |
| `levels` | `levels` | `/levels` | 레벨 테이블 |
| `chal` | `chal` / `chalnew` / `chaldet` | `/challenges` · `/new` · `/:chalId` | 챌린지 목록 / 등록 / 상세 |
| `ach` | `ach` | `/achievements` | 업적 목록 |
| `pay` | `pay` / `paydet` | `/payments` · `/payments/:payId` | 결제 내역 / 상세 |
| `shop` | `gems` / `shop` | `/shop/gems` · `/shop/display` | 젬 상품 / 상점 진열 |
| `ops` | `notice` `event` `push` `pushnew` `pushdet` `grant` | `/ops/notices` `/ops/events` `/ops/push` `/ops/push/new` `/ops/push/:id` `/ops/grants` | 공지 / 이벤트 / 푸시 알림 / 지급·회수 |
| `cs` | `qna` `qnadet` `faq` `faqnew` | `/support/inquiries` `/support/inquiries/:id` `/support/faq` `/support/faq/edit` | 1:1 문의 / FAQ |
| `code` | `codes` `codedet` `codenew` `coupons` `couponnew` `coupondet` | `/codes…` `/coupons…` | 공통 코드 / 쿠폰 코드 |
| `admin` | `admins` `adminnew` `admindet` `audit` `ui` | `/admins…` `/audit` `/ui-kit` | 관리자 계정 / 감사 로그 / UI 컴포넌트 |
| — | `login` | `/login` | (레이아웃 밖) |

### 5.2 화면 메타 단일 소스

라벨·경로·권한이 5군데(`NAV`, `FILEOF`, `SCRL`, `CRUMB`, 라우터)에 흩어져 있으면 반드시 어긋난다. **하나로 합친다.**

```ts
// src/domain/screens.ts
export const SCREENS = {
  dash:  { path: '/dashboard', label: '지표',        scope: 'dash'  },
  items: { path: '/items',     label: '아이템 목록',  scope: 'items', section: 'items' },
  item:  { path: '/items/:itemId', label: '아이템 상세', scope: 'items', section: 'items' },
  // …
} as const satisfies Record<string, ScreenMeta>
```

내비게이션 트리(`NAV`)·브레드크럼·탭바·권한 게이트·라우터가 **전부 이 맵에서 파생**된다.

- `section`: 탭바가 상세 화면을 별도 탭으로 열지 않고 **부모 섹션 탭으로 접는** 원본 `sectionOf()` 동작을 위한 필드. (`/items/3`을 열어도 탭은 "아이템 목록" 하나.)

### 5.3 코드 스플리팅

`AdminLayout`은 즉시 로드, 각 `features/*` 페이지는 `React.lazy`. 라우트 경계가 곧 청크 경계.

---

## 6. 상태 관리

### 6.1 상태별 소유자

| 상태 | 소유자 | 지속성 | 원본 대응 |
|---|---|---|---|
| 현재 화면 | react-router `location` | URL | `state.screen` |
| 테마 (light/dark) | `themeStore` (zustand persist) | `localStorage: riruti_admin_theme_v1` + `<html data-theme>` | `THKEY` |
| 사이드바 그룹 펼침 | `navStore` | `localStorage: riruti_admin_nav_v1` | `NKEY` |
| 열린 탭 목록 | `tabsStore` | `localStorage: riruti_admin_tabs_v1` | `TKEY` |
| 뷰어(역할·권한) | `viewerStore` | `localStorage: riruti_admin_view_v1` | `VIEWKEY` |
| 목록 필터 (`slot`/`tier`/`q`/`view`/`page`) | **URL `useSearchParams`** | URL | `state.slot` 등 — 아이템 목록에서 구현 (§18) |
| 폼 입력 (`f`/`cf`/`gf`) | `react-hook-form` (페이지 로컬) | 없음 | `state.f` 등 |
| 상점 진열 순서 | 페이지 로컬 → 저장 시 API | 없음 | `state.shopOrder` |

### 6.2 테마 초기화 — FOUC 방지

zustand persist는 React 마운트 이후에 읽힌다. 그 전에 흰 화면이 번쩍인다.
→ `index.html`의 `<head>`에 **인라인 블로킹 스크립트**로 `data-theme`을 먼저 세팅한다.

```html
<script>try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem('riruti_admin_theme_v1'))?.state?.theme||'light'}catch(e){}</script>
```

### 6.3 탭 스택 규칙

**탭 하나 = 사이드바의 서브 메뉴 하나다.** 같은 서브 메뉴가 두 번 열릴 일은 없고,
거기서 파생되는 화면(상세·등록·수정)은 **그 탭 안에서 화면만 바뀐다.**
어느 서브 메뉴에 속하는지는 `sectionOf` 가 정한다(§5.2).

```text
/items      →  「아이템 목록」 탭
/items/3    →  같은 탭. 경로만 바뀐다
/items/new  →  같은 탭
```

> 한때 탭 키를 **경로**로 바꿔 `/items/3` 과 `/items/7` 을 별개 탭으로 열게 했다가
> 되돌렸다. 아이템 둘을 나란히 편집하려던 것인데, 실제 기획은 그런 흐름이 아니고
> **탭 스트립이 사이드바와 어긋난다** — 상세를 몇 개 열면 스트립이 「아이템 상세 #12」
> 로 차서 지금 어느 메뉴에 있는지가 안 보인다.

- 최대 **12개**(`MAX_TABS`) = 서브 메뉴 12개.
- 넘치면 **깨끗한 탭부터** 밀어낸다. ⚠️ **미저장 탭은 절대 자동으로 밀어내지 않는다** —
  밀려난 탭은 keep-alive 캐시까지 파기되어 작성 중이던 내용이 **확인 한 번 없이** 사라진다.
  그래서 `MAX_TABS` 는 **깨끗한 탭에만 걸리는 상한**이고, 전부 미저장이면 그 위로 늘어난다.
  무한히 늘지는 않는다 — 탭이 서브 메뉴당 하나뿐이라 천장이 서브 메뉴 개수로 이미 정해져 있다.
  `<KeepAlive max>` 도 열린 탭 수를 따라가야 한다. 고정값이면 **KeepAlive 가 대신 LRU 로
  밀어내** 막아 둔 뜻이 없어진다.
- 활성 탭을 닫으면 마지막 탭으로 이동. **마지막 탭을 닫으면 `/` 로 간다.**

⚠️ **"열린 탭이 없음"은 URL 로 표현해야 한다.** 경로를 그대로 두고 본문만 비우면
사이드바와 브레드크럼이 **방금 닫은 화면을 계속 가리킨다** — 아무것도 안 열렸는데
메뉴 하나가 켜져 있는 꼴이다. `/` 는 어느 화면에도 매칭되지 않으므로
(`matchScreen` → `null`) 그 둘이 저절로 꺼진다. `features/EmptyWorkspace` 가 그 자리다.

> 그래서 `/` 는 지표로 리다이렉트하지 않는다. 로그인 뒤에는 `firstScreen` 이 화면
> 경로로 보내므로 평소에는 여기로 오지 않는다.
>
> 본문만 비우는 방법도 생각했는데, 그러면 **탭을 다 닫은 화면을 사이드바에서 다시
> 눌러도 아무 일이 없다** — 경로가 그대로라 `openTab` 을 부르는 효과가 다시 돌지 않는다.
- 권한 밖(`canAccess === false`) 탭은 복원 시 걸러낸다.
- 탭 라벨은 **서브 메뉴 이름 그대로**다. 파생 화면에 들어가도 바뀌지 않는다.
  한때 `아이템 목록 › 아이템 상세` 처럼 덧붙였는데 **화면 이름 둘을 이어 붙이니 읽기
  나빴고**, 어차피 브레드크럼이 같은 것을 이미 말한다
  (`리루티 › 아이템 › 아이템 목록 › 아이템 상세`). 탭은 "어느 메뉴에 있는가"만 맡는다.

**열린 탭의 화면은 언마운트되지 않는다.** `<KeepAlive>` 가 `useOutlet()` 의 결과를 감싸고,
비활성 화면은 **DOM 에서 분리(detach)** 되며 React 상태만 메모리에 남는다.
`display:none` 보다 나은 이유는 레이아웃·페인트 비용이 아예 들지 않아서다.

**탭 하나가 화면 둘까지 살려 둔다** (`livePaths`) — 지금 보는 파생 화면과 서브 메뉴 화면.
상세를 보다 목록으로 돌아왔을 때 필터가 그대로여야 "탭 안에서 전환됐다"로 읽힌다.
다른 상세로 옮기면 앞의 상세는 파기된다 — 같은 서브 메뉴의 상세를 둘 동시에 살려 두지 않는다.

그래서 `<KeepAlive max>` 는 **열린 탭들의 `livePaths` 합**을 따라간다
(`Math.max(MAX_TABS, tabs.length) * 2`). `MAX_TABS * 2` 로 고정하면 미저장 탭이
상한을 넘겼을 때(위) **KeepAlive 가 대신 LRU 로 밀어내** 막아 둔 뜻이 없어진다.

⚠️ **`<Outlet/>` 이 아니라 `useOutlet()` 을 넣는다.** `<Outlet/>` 은 그릴 때마다 라우터
컨텍스트를 다시 읽어 **캐시해 둔 화면까지 "지금 경로"를 그린다** — 캐시가 통째로
무의미해진다. 실제로 그렇게 두었다가 **탭을 옮기면 상태가 전부 날아갔다**(dev·prod 둘 다).
`useOutlet()` 은 지금 라우트의 **엘리먼트**를 주므로 그대로 캐시에 들어간다.

⚠️ **탭의 `path` 는 쿼리까지 담는다** (`/items?slot=BODY`). 목록 필터가 주소에
있으므로(§18.1) 떨어뜨리면 탭을 옮겼다 돌아올 때 필터가 풀린다. 화면 매칭과
캐시 키는 경로만 본다.

TODO(스크롤이 실제로 거슬리면): 스크롤 위치는 아직 안 남는다 — `window` 스크롤이라
keep-alive 가 손대지 못한다. 라이브러리 예제의 `ScrollTop` 패턴이 필요하다.

⚠️ **`destroy` 는 한 틱 뒤에 지운다.** 이벤트만 쏘고 실제 목록 제거는
`setTimeout(…, 0)` 안에서 일어난다(keepalive-for-react 5.0.11). 버리기로 한 경로로
**그 한 틱 안에** 되돌아오면 예약된 제거가 방금 되살아난 항목을 지워 본문이 빌 수 있다.
예약을 취소하는 API 가 없고, 30번 × 0~4ms 로 훑어도 재현되지 않아 그대로 두었다 —
되돌아가려면 입력 이벤트가 그 한 틱 안에 들어와야 한다. 목격되면 그 자리부터 볼 것.

⚠️ **같은 탭 안에서 화면을 옮기면 앞의 화면이 파기된다.** `useUnsavedGuard` 는
"더럽다"를 기록만 하고 이동을 막지 않고, `beforeunload` 는 브라우저를 닫을 때만 뜬다.
그 사이 구멍을 `useUnsavedNavGuard`(react-router `useBlocker`)가 메운다 —
`/items/3` 에서 `/items/7` 로 갈 때 확인 창을 띄운다.

**다른 서브 메뉴로 가는 것은 막지 않는다.** 그때는 이 탭이 경로를 그대로 들고 있어
화면이 살아 있다. 아무것도 잃지 않는 이동에 확인을 물으면, 그런 창은 몇 번 겪고 나면
읽지 않고 누르게 되어 **정작 필요할 때 안 먹는다.**

여기서 딸려 오는 함정 셋:

| | |
|---|---|
| `useEffect` cleanup 이 안 돈다 | 폴링·구독·타이머는 `useEffectOnActive` 로 감싸 비활성 탭에서 멈춘다 |
| 탭을 닫으면 캐시도 버려야 한다 | `AdminLayout` 이 `aliveRef.destroy(orphans)` 로 잇는다. 이 배선을 지우면 닫은 탭이 메모리에 남는다 |
| **분리된 노드에는 못 여는 것이 있다** | `showModal()`·`showPopover()` 가 `InvalidStateError` 를 던진다. `Dialog`·`Select` 가 `isConnected` 로 막는다 |

---

## 7. 데이터 계층 (목 데이터 유지)

### 7.1 3단 구조

```text
features/*  ──▶  api/*.ts  ──▶  mocks/*.ts     데이터 출처
 (화면)          (파사드)        (시드 RNG 생성기)
                    │
                    └──▶  domain/*.ts          조회 규칙 (정렬·필터)
```

**규칙은 `domain/`, 데이터는 `mocks/`.** `mocks/` 는 생성만 하고, "판매량 상위 5개" 같은 규칙은 `domain/` 이 갖는다. 파사드가 둘을 조합한다 — 그래야 서버로 갈아탈 때 규칙이 딸려 사라지지 않는다.

```ts
topItems: topSelling(allItems(), 5)   // domain 규칙 × mocks 데이터
```

`src/api/*.ts`는 **처음부터 `Promise`를 반환**한다. 실서버 붙일 때 파사드 내부만 `fetch`로 바꾸면 화면 코드는 손대지 않는다.

```ts
// src/api/items.ts
export async function listItems(q: ItemQuery): Promise<Paged<Item>> {
  if (USE_MOCK) {
    await mockDelay()
    return filterItems(allItems(), q)          // domain 규칙 × mocks 데이터
  }
  return http.get<Paged<ItemDto>>('/admin/items', { params: q }).then(toItems)
}
```

`http` 는 `get` · `post` · `put` · `patch` · `delete` 를 제공하고 **본문을 바로 반환**한다
(`AxiosResponse` 껍데기를 벗겨둠). 에러는 인터셉터가 `ApiError` 로 정규화한 뒤 던진다.

### 7.2 목 데이터 생성 규칙

원본 `build()`의 **시드 RNG를 반드시 유지**한다 (`rng(seed)` → `s = (s*9301+49297) % 233280`). 랜덤이 아니라 결정적이어야 새로고침할 때마다 숫자가 튀지 않고, 스크린샷 비교/리뷰가 가능하다.

- `src/mocks/assetTable.ts` — 원본 `A` 테이블. `[ref, name, sub, raw]` 튜플 → 명명 필드 객체로 변환. `raw`가 `'P'`로 시작하면 **유료(프리미엄)** 등급.
- 파생 규칙도 원본 그대로: 가격 `tier === 'PAID' ? [480,720,960,1200][i%4] : 0`(무료는 0 — §7.3 의 `Item.price`), 노출 상태 미노출 8% / 예약은 **남은 것의** 8%(≈7.4%) — 원본이 난수를 두 번 뽑는다, 챌린지 `일상/주간/시즌` × 6개 = 18개.

### 7.3 도메인 타입

원본은 **표시 문자열을 그대로 상태값으로** 썼다.

```ts
type Tier = '무료' | '유료'
type ItemStatus = '노출' | '예약' | '미노출'
```

실서버는 `PAID`·`VISIBLE` 같은 코드를 줄 가능성이 높다. 한글이 곧 타입이면 API 값이
정해지는 순간 전 화면을 손봐야 하고, 표시 문구를 다듬는 것과 상태를 바꾸는 것이
구분되지 않는다. 그래서 **코드값으로 정의하고 한글은 `labels.ts` 로 분리한다.**
(결정됨 — §11-1)

```ts
// src/domain/item/types.ts — React 를 모르는 순수 타입
export type Slot = 'HEAD' | 'BODY' | 'HAND' | 'FACE'
export type Tier = 'FREE' | 'PAID'
export type ItemStatus = 'VISIBLE' | 'SCHEDULED' | 'HIDDEN'
export type ItemSource = 'SHOP' | 'CHALLENGE' | 'ACHIEVEMENT' | 'LEVEL' | 'SEASON_PASS'

export type Item = {
  key: number
  /** 표시용 코드 — 'IT-1001' */
  code: string
  /** 에셋 파일 id — 'as_head_0' (§8) */
  assetId: string
  name: string
  sub: string
  slot: Slot
  tier: Tier
  /** 젬 가격. 무료면 0 */
  price: number
  source: ItemSource
  sold: number
  /** 보유율 (%) */
  own: number
  status: ItemStatus
  season: string
  madeAt: string
}
```

```ts
// src/domain/item/labels.ts — 코드값 → 한글 + 배지 tone
import type { Slot } from './types' // domain 내부는 배럴이 아니라 파일 직접 (§4.4.1)

export const SLOT_LABEL: Record<Slot, string> = {
  HEAD: '머리', BODY: '몸', HAND: '손', FACE: '얼굴',
}
```

화면은 한글 문자열을 직접 쓰지 않고 이 매핑을 거친다. **배지 색(tone) 분기도 같이 둔다** —
원본은 상태마다 `s === '노출' ? C.gFg : …` 를 화면 코드에서 골랐는데, 그 분기가
화면마다 흩어지면 상태가 하나 늘 때 전부 찾아다녀야 한다.

> `interface` 가 아니라 `type` 인 이유는 §13. 이 프로젝트에는 `.d.ts` 의 선언 병합을
> 제외하면 `interface` 선언이 없다.

---

## 8. 에셋 (개별 SVG 파일)

> **⚠️ 원본이 잘려 있고, 되받을 수 없다.** `design/riruti-assets.js`는 정확히 262,144자(256 KiB)에서 끊긴다 — DesignSync `get_file`의 상한이고 **오프셋·범위 인자가 없어** 이어받을 방법이 없다. 마지막 심볼 `as_face_9`(광대코)가 path 속성 중간에서 잘려 빌드에서 제외된다.
>
> **그래도 블로커는 아니다.** 그 파일은 플랫 내보내기일 뿐이고 원화는 컴포넌트 파일에 따로 있다 — 배경 16·둥지 3·업적 12는 거기서 직접 뽑는다(§8.6). 아직 없는 것은 **유료 배경 4(`as_bg_16..19`) · 성장 단계 · 이모티콘**뿐이고, 그건 Claude Design 에서 원본을 내려받아 덮어쓰면 나온다.

### 8.1 원본의 구조

`riruti-assets.js` = `window.RIRUTI_LIB` 문자열. 안에 최상위 `<g id="...">` **61개** + 셸 html에 직접 박힌 `<symbol>` 5개.

| 접두 | 개수 | 내용 |
|---|---|---|
| `ic_*` | 10 (+ 셸 5) | UI 아이콘 — 합쳐서 **15개** |
| `as_head_*` `as_body_*` `as_hand_*` `as_face_*` | 46 | 착용 아이템 |
| `rg` `rgB` `rgE` | 3 | 캐릭터 리그 |
| `nst3b` `nst3f` | 2 | 둥지 앞/뒤 레이어 |

`bg` · `nest` · `growth` · `ach` · `emoji` 에셋은 **이 파일에 없다.** 형제 디자인 파일에 있어서, 그중 배경·둥지·업적은 §8.6 이 직접 뽑는다.

### 8.2 원본에서 감안해야 하는 네 가지

1. **`<g id>`는 `<symbol>`이 아니다** — viewBox를 실을 수 없다. 그래서 원본이 `VB` 맵으로 그룹별 viewBox를 따로 들고 다녔다.

   | 그룹 | viewBox |
   |---|---|
   | `head` `body` `hand` `face` `growth` `rg*` | `298 -6 341 491` |
   | `bg` `nest` `nst*` | `0 0 586 576` |
   | `ach` | `0 0 200 200` |
   | `emoji` | `320 -12 296 322` |

   → 빌드에서 `<svg viewBox="…">`로 승격하면 **`VB` 맵이 통째로 사라진다.**

2. **중첩 `<g>`** — 에셋 그룹 안에 `<g>`가 또 들어 있다(원본 기준 열림 190 / 최상위 61). 첫 `</g>`로 끊으면 본문이 잘리므로 깊이를 세어 짝을 맞춰야 한다.

3. **`nst3f`는 닫는 `</g>`가 빠져 있다.** 원본은 이 마크업을 `innerHTML`로 주입해서 브라우저 파서가 알아서 닫아줬기 때문에 드러나지 않았던 결함이다. 빌드가 같은 방식으로 복구한다.

4. **공유 `<defs>`** — `aurM` `aurS` `aurR` `aurP`(유료 로브 4종의 오라 `<radialGradient>`)와 `nestLin`(둥지 `<linearGradient>`)은 **스프라이트 루트**에 정의돼 있고 여러 에셋이 `url(#aurP)`로 참조한다. `rg`는 `<use href="#rgB">`로 다른 그룹을 참조한다.
   파일을 쪼개면 이 참조가 끊기므로, 빌드가 각 파일에 필요한 정의를 **전이적으로 찾아 인라인**한다.

   > 초기 스프라이트 방식에서는 이 공유 defs가 통째로 누락되어 유료 로브 4종의 오라가 렌더되지 않고 있었다. 파일 분리 과정에서 발견해 고쳤다.

   현재 유일하게 해결되지 않는 참조는 `nst3f → nb3`(clip-path)로, 잘린 원본에 정의 자체가 없다.

### 8.3 브랜드 로고는 손으로 둔다

`src/assets/brand/logo.png` — `icons/` · `images/` 와 달리 **생성물이 아니다.**
`bun run assets` 가 건드리지 않고 `.gitignore` 에도 없다. 새 로고를 받으면 이 파일을 교체한다.

```ts
import { LOGO } from '@/assets/brand'
<img src={LOGO} width={32} height={32} alt="" />
```

로고 자체가 파란 그라디언트라 **배경 사각형을 씌우지 않는다** — 사이드바에서는 그대로 놓고,
로그인 좌측 패널에서만 흰 카드 위에 올린다 (파란 그라디언트 배경에 묻히기 때문).
어두운 표면에서도 시안 계열이라 대비가 충분하다.

400×400 PNG 다. 최대 표시가 104px 라 3배수 이상이고, `assetsInlineLimit`(4KB) 을 넘어 base64 로
녹지 않고 해시 붙은 파일로 나간다.

### 8.4 설계 — 아이콘은 컴포넌트, 에셋은 이미지 파일

성질이 달라서 갈래를 나눈다. 기준은 **`currentColor` 사용 여부**다.

| | UI 아이콘 | 캐릭터 에셋 |
|---|---|---|
| 개수 / 용량 | 15개 · 4.5KB | 81개 · 303KB (§8.6 의 31개 포함) |
| `currentColor` | **29곳에서 사용** | 0 (색이 박혀 있음) |
| 위치 | `src/assets/icons/*.svg` | `src/assets/images/*.svg` |
| 소비 방식 | `?react` (svgr) → **인라인 React 컴포넌트** | URL import → **`<img loading="lazy">`** |
| 이유 | `<img>`로는 CSS `color`가 닿지 않아 테마별 색을 물려받을 수 없다 | 파일 단위 캐시 + 보이는 것만 다운로드 |

> 용량은 **파일 내용의 바이트 합**이다. `du` 로 재면 작은 파일이 많아 블록 단위로 부풀려진다 — 아이콘 15개가 4.5KB 인데 `du` 는 64KB 라고 한다.

```tsx
<Icon name="ic_bird" />                       // 인라인 SVG, color 상속
<AssetThumb assetId="as_head_0" tier="PAID" /> // <img>, 지연 로드
```

**측정된 효과**: 대시보드 최초 로드에서 SVG 요청 **4건 / 22KB**. 예전 스프라이트 방식은 화면에 무엇이 보이든 239KB 덩어리를 통째로 받았다.

빌드는 `assetsInlineLimit`을 SVG에 대해 꺼둔다 — 4KB 미만 파일이 base64로 JS에 녹으면 파일로 뺀 의미가 없다.

`src/assets/{icons,images}/index.ts`는 자동 생성되며 `IconId` · `AssetId` 리터럴 타입을 함께 내보낸다. 없는 id를 쓰면 컴파일 에러가 난다.

### 8.5 에셋을 새로 들이기 (업로드)

빌드에 들어온 SVG 는 **고를** 수만 있다. 새 그림은 `AssetPicker` 안의 「새 이미지 올리기」로 들어온다 — 별도 「에셋 등록」 화면을 만들지 않았다.

**통합 에셋 등록 화면은 만들지 않는다.** 규격이 종류마다 다르고(아래), 권한 스코프가 갈리며(`items`/`bg`/`ach`), 우리 탭 모델은 **탭 하나 = 사이드바 서브 메뉴 하나**라 어느 서브 메뉴에도 안 속하는 화면은 미아가 된다. **화면은 각각, 부품은 공유**한다.

규격은 `domain/asset.ts` 의 `ASSET_SPECS` 에 있고 값은 디자인 원본의 `VB`(viewBox) 표에서 그대로 왔다.

| 종류 | 비율 | 한도 |
|---|---|---|
| 의상(머리·몸·손·얼굴) · 성장 단계 | 341:491 | 512KB |
| 배경 · 둥지 | 586:576 | 2MB |
| 업적(뱃지) | 200:200 | 256KB |
| 이모티콘 | 296:322 | 128KB |

⚠️ **가로세로는 검사하지 않는다.** 파일을 열어야 알 수 있고 SVG 는 `viewBox` 를 믿을 수 없다(없거나 틀린 파일이 흔하다). 형식·크기만 막고, 그림이 맞는지는 미리보기로 사람이 본다.

**등록은 한 번이다 — 이미지와 정보가 같이 저장된다.**

```text
아이템 등록 화면
 └ 이미지 ─ [에셋 고르기] ─┬ 기존 45개 중에서 고르기
                          └ 「새 이미지 올리기」  ← 파일 선택 (미리보기만 생긴다)
                                    ↓
                          [등록] 한 번 ← 업로드와 본문 저장이 여기서 함께 일어난다
```

⚠️ **파일을 고르는 순간 올리지 않는다.** 그때는 `objectURL` 로 미리보기만 만들고, 실제 업로드는 「등록」을 누를 때 한다. 고르자마자 올리면 **등록을 중간에 그만둔 사람의 그림이 남는다** — `/security` 에서 시크릿을 버튼 누른 순간에만 발급하는 것과 같은 이유다(§16).

⚠️ **올린 에셋은 `assetId` 로 찾을 수 없다.** 빌드에 없기 때문이다. 그래서 파사드가 `assetSrc` 를 실어 준다(`withAssetSrc`) — 실서버라면 조인해서 내려줬을 값이고, 화면은 `AssetThumb` 에 `src` 로 넘기기만 한다. 이걸 빠뜨리면 방금 올린 그림이 목록·상세에서 `?` 로 뜬다(실제로 그랬다).

⚠️ **새로고침하면 올린 에셋이 사라진다.** `blob:` URL 이라 문서 수명을 못 넘는다. `sessionStorage` 에 dataURL 로 남기지 않는 이유는 용량보다 **일관성**이다 — 아이템 자체가 메모리에만 사는데 그림만 남으면 **주인 없는 그림**이 카탈로그에 쌓인다.

⚠️ **SVG 는 스크립트를 품을 수 있다.** `<img src>` 로만 그리므로 이미지 컨텍스트에서 실행되지 않아 지금은 안전하다. 서버가 붙으면 받을 때 sanitize 해야 하고, 이미지와 본문을 **한 multipart 요청**으로 묶어야 한다 — 둘로 나누면 업로드만 성공했을 때 주인 없는 그림이 남는다.

### 8.6 원화에서 직접 뽑기 (배경 · 둥지 · 업적)

`riruti-assets.js` 가 잘려 못 받으므로(§8), 이 세 그룹은 **원화 파일에서 뽑는다.** `build-assets.ts` 는 원래 소스 둘(`riruti-assets.js` + 셸 html)을 합치고 있었고, 여기에 둘을 더한 것뿐이다 — `resolveDeps`(전이적 defs 추적) · `viewBoxFor` · `index.ts` 생성은 그대로 재사용한다.

| 그룹 | 원본 | 방법 |
|---|---|---|
| 업적 12 | `riruti-art-8.dc.html` | 인라인 `<svg>` 를 순서대로. **템플릿 평가 없음** |
| 배경 16 | `루티새v2.dc.html` | `SCENE` 색표 + `sc-if` 분기 접기 |
| 둥지 3 | `루티새v2.dc.html` | `NEST` 경로표 + `nestMoss`·`nestHome` 분기 접기 |

접는 규칙은 `scripts/asset-rules.ts` 에 순수 함수로 있다(`bundle-rules`·`doc-rules` 와 같은 모양). 전부 **애매하면 던진다** — 잘못된 SVG 보다 실패한 빌드가 낫다.

⚠️ **디자인 파일의 코드를 실행하지 않는다.** 원본의 `renderVals()` 를 `new Function` 으로 돌리면 파생 규칙까지 그대로 따라갈 수 있어 편하지만, **디자인 파일은 데이터지 실행할 코드가 아니다.** 필요한 것은 색표 하나와 경로표 하나뿐이라 `jsTable()` 로 읽는다. 대신 파생(`scStudio: scene === 'studio'`)을 우리가 다시 쓰게 되는데, 어긋나면 `assertResolved` 가 **처리 못 한 자리표시자**로 잡아 빌드를 세운다.

⚠️ **합류 순서가 곧 우선순위다.** `byId.set` 이라 나중 소스가 이긴다. 원화에서 뽑은 것을 **앞**에 두어, 나중에 온전한 `riruti-assets.js` 를 받으면 그게 우리 것을 덮어쓰게 한다. 뒤에 두면 온전본을 넣고도 계속 우리 것이 쓰여 왜 안 바뀌는지 모르게 된다.

⚠️ **`searchSpace` 에 새 소스도 넣어야 한다.** 빠뜨리면 배경의 `url(#rvScene)` 이 안 풀려 **클립이 사라지고 그림이 카드 밖으로 번진다** — 경고는 찍히지만 화면은 그럴듯하다.

⚠️ **구간 경계는 문자열 위치로 찾는다.** 배경은 `bgOn`~`nestOn` 직전, 둥지는 `nestOn`~`perchOn` 직전이다(그 뒤가 새). 표지를 못 찾으면 **던진다** — 빈 문자열로 넘어가면 0바이트 에셋이 나오는데 그건 `?` 플레이스홀더보다 나쁘다. 없는 게 아니라 깨진 것이고 아무도 눈치채지 못한다.

⚠️ **업적은 순서가 곧 id 다.** 어긋나면 「첫 알」 자리에 트로피가 뜬다. 기대값을 **손으로 적지 않고** `riruti-admin-ach.dc.html` 의 `이름·설명` 표에서 읽어 대조한다 — 옮겨 적은 상수는 원본이 바뀌어도 안 바뀌어서 검사가 **과거의 원본**을 지키게 된다.

**원본에 없는 것은 비워 둔다.** 유료 배경 4(은하·마법진·심해·왕좌의 방)와 성장 「금」. 비슷한 것으로 채우면 — 「우주」를 복사해 「은하」로 쓰면 — 목록에 같은 그림이 두 번 나오고, **나중에 진짜 아트가 왔을 때 무엇이 가짜였는지 알 수 없다.** `AssetThumb` 의 `?` 가 "아직 없음"을 정직하게 말한다.

**성장 단계는 여기 없다.** 배경·둥지는 템플릿의 자기 완결적 구간이라 잘라내면 끝이지만, 유체·성체는 **새 전체**를 그려야 해서 `sc-if` 120개짜리 템플릿을 통째로 평가해야 한다. 성격이 다른 작업이라 뗐다.

---

## 9. 공용 컴포넌트 인벤토리

디자인에서 **반복 사용이 확인된 것만** 추출한다. 추측으로 미리 만들지 않는다.

`shared/ui` 는 **도메인을 모른다.** 도메인 타입을 prop 으로 받으면 `shared ⇄ domain`
순환이 생기므로, 필요한 모양을 자기 prop 계약으로 선언한다 (§4.4).

**Panda 레시피(`cva`)는 variants 가 실제로 여러 개일 때만 쓴다.** 하나뿐이면 평범한
prop 이 읽기 쉽다 — 아래 "레시피 없음" 은 미완성이 아니라 그 판단의 결과다.

| 컴포넌트 | 현재 API | 디자인 근거 |
|---|---|---|
| `Button` | cva — `variant`: `primary`\|`secondary`\|`ghost` / `size`: `sm`\|`md`\|`icon` | `style-hover`/`style-active`/`style-focus` 3종 상태가 모든 버튼에 반복 |
| `Badge` | cva — `tone` 8종 / `size`: `sm`\|`md` | 8개 fg/bg 쌍이 그대로 tone 이 된다 (§3.2) |
| `Card` | `className` 만. 여백은 부르는 쪽이 정한다 | `surf` + `1px bd` + `radius 12` — 전 화면 공통 |
| `StatCard` | `label` `value` `delta` `direction`(`up`\|`down`) `note` | KPI 6종 (`▲ +6.2% 전주 대비`) |
| `ProgressBar` | `rate` `label`(필수). 색은 rate 로 정한다(≥60 `gFg`, ≥35 `pri`, 그 외 주황) | 챌린지 달성률 |
| `Icon` | `name`(IconId) `size` | svgr 컴포넌트 래퍼 (currentColor 상속, §8.4) |
| `AssetThumb` | `assetId` `size` `paid` `alt` | 아이템/배경/둥지 썸네일. `paid` 면 타일 배경을 어둡게(`tilePaid`) |
| `OtpInput` | `value` `onChange` `length` `invalid` `aria-label`(필수) | 2단계 인증 코드 입력 (§16) |
| `Table` | `columns` `rows` `minWidth` `onRowClick` `rowKey`. `Column.render` 로 배지·썸네일 | 목록 화면의 본체. 좁은 화면에서 스스로 가로 스크롤 |
| `Input` | `value` `onChange` `label` `hint` `error` `required` `prefixIcon` `suffix` `size`(`md`\|`lg`) | 필터 바 · 등록/수정 폼 |
| `Segmented` | `value` `onChange` `options` `aria-label`(필수) | 슬롯·등급·종류 필터 (원본 `tabOf()`/`seg()`) |
| `PageHeader` | `title` `sub` `actions` | 화면 맨 위 제목 줄. **`className` 을 받지 않는다** — 여백을 밖에서 덮는 게 Panda 에서 조용히 안 먹는다(§9.2) |
| `EmptyState` | `icon` `title` `body` `action` | 결과 없음. "로딩이 끝난 건지 결과가 없는 건지" 를 가른다 |
| `Skeleton` | `rows` | 로딩 자리. 표가 들어올 크기를 미리 잡아 화면이 튀지 않게 한다 |
| `Checkbox` `ErrorBanner` | — | `features/auth` 에서 만들어졌다가 보안 화면이 두 번째 사용처가 되어 승격 (§4.4) |
| `LineChart` / `BarChart` | Recharts 래퍼 | DAU 추이 / 젬 유입·소비 (§9.1) |
| `Select` | `value` `onChange` `options` `label` `placeholder` `hint` `error` `required` `disabled` `size` `name` | **펼친 목록까지 직접 그린다.** 필터·폼의 단일 선택 |
| `Switch` | `checked` `onChange` `label`(필수) `hint` `disabled` | **즉시 반영되는 설정에만.** 저장 버튼이 있는 폼에는 `Checkbox` |
| `Pagination` | `page`(1부터) `perPage` `totalItems` `onChange` | 목록 아래. **번호를 늘어놓지 않는다** — `384건 중 61–80` + `⟨⟨ ⟨ 4 / 20 ⟩ ⟩⟩` |

> **번호 목록을 버린 이유.** 어드민에서 "13페이지로 점프"는 거의 일어나지 않는다.
> 실제 흐름은 정렬·필터를 바꾸고 앞에서부터 훑는 쪽이다. 번호 목록은 그 드문 조작을
> 위해 자리를 크게 먹고, 더 나쁜 건 **페이지를 옮길 때마다 어느 번호가 보일지가
> 바뀐다**는 점이다 — 방금 누른 자리에 다른 숫자가 와 있다.
>
> 번호가 하던 일을 셋으로 나눴다.
>
> | 번호 목록이 주던 것 | 대신 |
> |---|---|
> | 지금 몇 번째 쪽인가 | `4 / 20` |
> | 얼마나 남았는가 | `384건 중 61–80` — 쪽 수보다 건수가 더 와닿는다 |
> | 끝으로 한 번에 | `⟨⟨` `⟩⟩` |
>
> 그래서 **건수는 이 컴포넌트가 그린다.** 번호가 있을 때는 필터 옆에 두는 게 맞았지만,
> 번호를 없앤 지금은 이게 "어디쯤인가"를 말하는 유일한 것이다.

> ⚠️ **오른쪽 조작부의 좌표가 변하면 안 된다.** 폭이 1px만 변해도 방금 누른 자리에
> 다른 것이 와 있고, 연달아 누르면 **화면이 깜빡이는 것처럼 보인다.** 처음 만든
> 번호 목록형이 4→5→6→7칸으로 늘어나서 실제로 그랬다. 두 곳에서 막는다.
>
> | | |
> |---|---|
> | 요약과 조작부 | `space-between`. 요약(`384건 중 61–80` ↔ `384건 중 381–384`)은 왼쪽에서 오른쪽으로 자라고 조작부는 오른쪽 끝에 붙는다 |
> | `4 / 20` | `totalPages` 자릿수만큼 폭을 미리 잡고 `fontVariantNumeric: 'tabular-nums'`. 비례 숫자는 `1` 과 `8` 의 폭이 다르다 |
>
> 재서 확인: 20페이지를 모두 눌러도 조작부의 좌표·폭(966px·190px)과 위치 표시의
> 좌표·폭(1030px·62px)이 각각 한 값이다.

> **`aria-live="polite"` 는 요약에만.** 쪽을 옮기면 표 내용이 통째로 바뀌는데
> 화면을 못 보는 사람에게는 아무 일도 안 일어난 것과 같다. `384건 중 61–80` 이
> 바뀌었다고 알리는 것이 그중 가장 쓸모 있다 — 화살표까지 라이브로 묶으면
> 누를 때마다 버튼 이름을 다시 읽어 시끄러워진다.

| `Textarea` | `value` `onChange` `label` `hint` `error` `required` `rows` | `Input` 과 **같은 계약**. 다르면 폼마다 다르게 쓰게 되고 그러다 `aria-describedby` 를 빠뜨린 화면이 하나 생긴다 |
| `FilePicker` | `label` `accept` `hint` `error` `required` `fileName` `preview` `onPick` `onClear` | 끌어다 놓기 + 클릭. **도메인을 모른다** — 무엇이 올바른 파일인지는 부르는 쪽이 `validateAssetFile` 로 정하고 결과만 `error` 로 준다. ⚠️ `<input type="file">` 을 `display:none` 으로 숨기면 **키보드로 열 수 없다** — 투명하게 만들어 영역 전체에 깔았다 |
| **미구현** `Toast` | — | 알림이 필요해지는 화면에서 |

> **`Segmented` 는 `<button role=\"radio\">` 가 아니라 네이티브 `<input type=\"radio\">` 를
> 숨겨서 쓴다.** 역할만 선언하면 스크린리더는 "라디오 그룹"이라 알리는데 화살표 키가
> 동작하지 않아 **없는 조작법을 약속**하게 된다. 같은 `name` 을 공유하는 네이티브
> 라디오는 화살표 이동·roving 포커스를 브라우저가 준다. `Checkbox` 와 같은 방식이다.

> **`Dialog` 는 네이티브 `<dialog>` 위에 그린다.** 직접 만든 모달은 포커스 가둠·Esc·
> 배경 inert 를 전부 다시 만들어야 하고, 하나만 빠져도 **마우스로는 멀쩡한데 키보드로만
> 고장난다.** 확인함: 모달이 열린 동안 배경 버튼은 `focus()` 로도 포커스되지 않고,
> Tab 은 페이지 밖(브라우저 UI)으로 나간다.

> **`Select` 는 네이티브를 버렸다.** `<select>` 는 닫힌 상태만 CSS 가 닿는다 — 펼쳐지는
> 팝업의 배경·행 높이·hover 색·모서리는 브라우저와 OS 가 그리고 우리 토큰이 전혀 먹지
> 않는다. 다크 모드에서 목록만 밝게 뜨는 것도 그래서다. 디자인을 끝까지 맞추려면
> 리스트박스를 직접 만드는 것 말고는 방법이 없다.
>
> **대신 브라우저가 주던 것을 전부 우리가 만들어야 한다.** 하나라도 빠지면 마우스로는
> 멀쩡한데 키보드·스크린리더에서만 고장난다.
>
> | | |
> |---|---|
> | 역할 | `role="combobox"` + `role="listbox"`/`option` (WAI-ARIA select-only combobox) |
> | 포커스 | **버튼에 그대로 둔다.** 활성 항목은 `aria-activedescendant` 로 가리킨다 — 포커스를 목록으로 옮기면 닫을 때 되돌리는 일이 늘고 그 자리에서 자주 샌다 |
> | 키보드 | ↑↓ 이동 · Home/End 양끝 · Enter/Space 고르고 닫기 · Esc 취소 · Tab 고르고 다음 필드 |
> | 타이핑 점프 | 500ms 안에 이어 친 글자로 앞부분 일치 |
> | 스크롤 | 활성 항목이 목록 밖이면 끌어온다. `scrollIntoView` 는 안 쓴다 — 조상까지 스크롤해서 본문이 같이 튄다 |
>
> ⚠️ **목록은 Popover API 로 top layer 에 올린다.** `position: absolute` 로 두면 조상의
> `overflow: hidden`(표·카드)에 잘리고 `z-index` 싸움이 시작된다. `popover="auto"` 라서
> **바깥 클릭과 Esc 는 브라우저가 처리**하고 포커스도 스스로 트리거로 돌려준다.
> 좌표는 `position: fixed` + `getBoundingClientRect` 로 직접 주고, 아래 자리가 모자라면
> 위로 뒤집는다. 스크롤은 **캡처 단계**로 받는다 — 어느 조상이 스크롤됐든 따라가야 한다.
>
> 확인함: 조상에 `overflow: hidden` 을 걸어도 잘리지 않고(138px 그대로), 뷰포트를
> 420px 로 줄이면 위로 뒤집혀 화면 안에 들어온다. axe 의 `aria-required-children`·
> `aria-required-parent`·`aria-valid-attr-value` 통과.
>
> ⚠️ **잃은 것도 있다.** 네이티브가 안에서 해 주던 **IME 조합 중 타이핑 점프**는
> 보장할 수 없다 — 조합 중 `keydown` 의 `key` 는 규격상 `'Process'` 다. 버튼은 편집
> 가능한 요소가 아니라 IME 가 아예 안 붙을 수도 있는데, 한글 라벨에서 어느 쪽인지는
> **확인하지 못했다** (자동화로 IME 입력을 만들 수 없다).
>
> ⚠️ **`_closed` 로 팝오버를 숨기려 하지 말 것.** Panda 의 `_closed` 는
> `[data-state="closed"]` 를 노리는 조건이라 팝오버에는 아무 일도 하지 않는다.
> 닫힌 팝오버를 숨기는 건 브라우저 기본 스타일이다 — 재서 확인했다.

> ⚠️ **모달 `<dialog>` 에 `margin: auto` 를 직접 준다.** 중앙 정렬은 브라우저 기본
> 스타일의 `margin: auto` 가 하는데 Panda 리셋의 `margin: 0` 이 그걸 덮는다.
> 빼면 창이 좌상단에 붙는데, 열어 보기 전에는 알 수 없다.

> **`Switch` 의 꺼진 상태를 회색 트랙으로 칠하지 않았다.** 원본의 `track`(#D3D9E2)은
> 흰 카드 위에서 1.42:1 이라 스위치가 있는지도 보이지 않는다 (WCAG 1.4.11 은 UI
> 요소에 3:1). `faint2` 테두리 + `faint2` 노브로 그려 3.34:1 을 맞췄다 — `faint2` 가
> 원래 이 용도의 토큰이다 (§11).

> `Field`(TextField/PasswordField)는 지금 `features/auth` 안에 있다. **두 번째 폼 화면이
> 생길 때** `shared/ui` 로 올린다 — 미리 올리면 로그인의 사정이 공용 컴포넌트에 스며든다 (§4.4).

> 참고: Claude Design 프로젝트에 이미 `components/forms/Button.jsx`, `components/data/Table.jsx` 등
> **레퍼런스 구현과 `.prompt.md` 가 존재**한다. 미구현 컴포넌트 착수 시 먼저 가져와 대조할 것.

### 9.1 차트 — Recharts

**색은 반드시 `token()` 을 거쳐 넘긴다.**

```tsx
import { token } from 'styled-system/tokens'
<Area stroke={token('colors.pri')} fill={token('colors.soft')} />
```

`token('colors.pri')` 는 `var(--colors-pri)` 문자열을 돌려주고, Recharts 는 SVG 로 그리므로 브라우저가 이걸 그대로 해석한다. **테마를 토글해도 리렌더가 필요 없다** — CSS 변수가 바뀌면 색이 따라온다. 실제로 다크 모드에서 라인 `#5B9BFF` · 영역 `#1C2C46` 로 자동 전환되는 것을 확인했다.

> canvas 기반 라이브러리(Chart.js, ECharts 기본 렌더러)를 골랐다면 이게 안 된다. canvas 2D 컨텍스트는 CSS 커스텀 프로퍼티를 해석하지 못해, 테마마다 `getComputedStyle` 로 실제 값을 읽어 차트를 다시 그려야 한다. 라이브러리 선택의 결정적 이유였다.

**주의**

- 토큰 이름을 손으로 `var(--colors-pri-d)` 처럼 쓰지 말 것 — 키가 kebab-case 로 바뀌므로 틀리기 쉽다. `token()` 만 타입체크된다 (§3.3).
- `isAnimationActive={false}` — 어드민에서 지표가 흐물거리며 올라올 이유가 없고, 스크린샷 비교도 불가능해진다.
- 범례는 Recharts 기본(`<Legend>`)이 아니라 직접 그린다. 여백·타이포가 디자인과 다르다.
- 차트 라이브러리는 별도 청크(`charts`)로 분리했다 (§9.2).

### 9.2 무엇을 lazy 로 할지

**셸 안의 화면(`IMPLEMENTED`)은 lazy, 로그인은 eager.** 성격이 다르다.

| | 이유 |
|---|---|
| `features/*` 화면 | 45개인데 사용자는 한 번에 하나만 본다. 대시보드만 해도 recharts 를 안고 **gzip 111KB** — eager 로 두면 첫 로드에 그게 얹힌다 |
| `LoginPage` | **미인증 사용자의 첫 화면.** lazy 로 만들면 `index` 받고 → 다시 요청 → 그 사이 폴백이 깜빡인다 |

측정 (로그인 화면 첫 로드, gzip). **아래 두 표는 그 결정을 내릴 때의 A/B 값이다** —
같은 빌드에서 한 쪽만 바꿔 비교한 것이라 절대값은 지금과 다르다. 현재 수치는 §12 를 본다.

| LoginPage | 첫 로드 | 요청 수 |
|---|---|---|
| lazy | 138.02 KB | 4 |
| **eager** | **135.92 KB** | **2** |

lazy 가 오히려 **크다**. 공유 청크(`Button-*.js`)가 갈라지면서 오버헤드가 붙고, 왕복이 2번 늘어난다.
3KB 아끼려고 첫 화면에 워터폴을 만드는 셈이다.

> 판단 기준: **임계 경로에 있으면 eager, 아니면 lazy.** 크기만 보지 말 것.

### 9.3 번들 분리 — `manualChunks` 를 쓰지 않는다

Recharts 는 gzip 105KB 다. 화면 코드와 같은 청크에 두면 대시보드를 고칠 때마다 다시 받게 되니
따로 빼는 게 좋아 보인다. **그래서 `manualChunks` 로 빼봤다가 되돌렸다.**

```ts
// ✗ 이렇게 하면 오히려 나빠진다
manualChunks: (id) => (/node_modules\/recharts/.test(id) ? 'charts' : undefined)
```

청크를 강제하면 Rollup 이 **엔트리와 charts 가 함께 쓰는 공용 모듈까지 charts 에 배치**한다.
그 순간 엔트리가 charts 를 정적으로 의존하게 되고(`import{i as d,o as u}from"./charts-*.js"`),
`index.html` 의 modulepreload 에 올라 **로그인 화면에서도 105KB 를 받는다.**

측정값 (gzip, 로그인 화면 첫 로드 — 위와 같은 시점의 A/B):

| | 첫 로드 | 대시보드 진입 시 추가 |
|---|---|---|
| `manualChunks` 있음 | **239 KB** (charts 포함) | 16 KB |
| 없음 (자동 분할) | **138 KB** | 117 KB |

자동 분할이 이미 recharts 를 lazy 한 `DashboardPage` 청크에 넣어준다. 첫 로드가 **101KB 가볍고**,
대가는 대시보드 코드를 고칠 때 117KB 를 다시 받는 것 — 배포 때만 생기는 비용이라 훨씬 싸다.

> 교훈: `manualChunks` 는 "이 라이브러리를 따로 빼겠다"는 의도와 달리 청크 그래프를 바꾼다.
> 넣은 뒤 반드시 `index.html` 의 modulepreload 목록을 확인할 것.

---

### 9.4 첫 로드 예산 — **성능 목표가 아니라 누수 탐지기다**

`bun run build` 끝에 `scripts/check-bundle.ts` 가 붙어 있다. `dist/index.html` 이 처음부터
받는 것(엔트리 JS · modulepreload · 스타일시트)을 gzip 해 합치고 **200KB** 와 견준다.
넘으면 빌드가 실패한다.

**왜 이 검사가 있는가**

로그인 뒤 어드민이라 첫 로드 몇십 KB 는 체감되지 않는다 — 사내망에서 149KB 는 0.01초다.
잡으려는 것은 속도가 아니라 **무거운 라이브러리가 엔트리로 새는 것**이다. 실제로
`manualChunks` 로 recharts 를 가르려다 엔트리가 recharts 를 정적 의존하게 되어
239KB 가 된 적이 있다(§9.3). 그런 사고는 **화면에서는 안 보이고 숫자에서만 보인다.**

**왜 200KB 인가**

| | |
|---|---|
| 지금 | 약 149KB |
| 흔한 누수 한 건 | +50 ~ 105KB (recharts 가 86KB) |
| 화면이 늘며 자라는 폭 | PR 당 약 0.3KB — 대부분 Panda 가 뿜는 원자 CSS |

**한 건의 누수를 반드시 잡으면서, 정상 증가로는 몇 년이 걸려야 닿는 값**이 200KB 다.
예전 값 150KB 는 "그때 143KB 였으니까" 라는 근거뿐이었고, 정상 증가만으로 닿아
**진짜 사고와 구분이 안 되는 경고**가 됐다. 경고가 자주 울리면 사람이 무시하기 시작한다.

> ⚠️ **숫자를 올리는 것으로 문제를 넘기지 말 것.** 넘었을 때 먼저 볼 것은 예산이 아니라
> **무엇이 늘었는가**다. 검사가 내역을 큰 것부터 항상 찍는 이유다.

**왜 `lint` 가 아니라 `build` 인가** — `dist/` 가 있어야 잴 수 있는데 lint 는 빌드를 하지 않는다.

**세는 것과 안 세는 것**

- 센다: `<script src>` · `<link rel="modulepreload">` · `<link rel="stylesheet">` 중 `/assets/` 로 시작하는 것.
  ⚠️ **태그와 `rel` 을 본다** — `src|href` 만 긁으면 파비콘(`rel="icon"`)이나 `<img>` 하나가
  들어오는 순간 **문서에 적은 경계와 다른 것을 재게 되고**, 빌드가 엉뚱하게 실패한다
- 안 센다: lazy 청크(그게 이 예산이 재려는 경계다) · `preconnect` 같은 외부 링크 ·
  `index.html` 자체(이력과 견줄 수 있게 제외하되 **숨기지 않고 함께 찍는다**)

판정은 `scripts/bundle-rules.ts` 에 있고 픽스처로 테스트한다 — 코드를 읽는 코드는 눈으로
맞는지 확인할 수 없다(§17 의 주석 검사기와 같은 규율).

---

## 10. 권한 (RBAC)

원본에 이미 스코프 기반 권한 구조가 들어 있다. 그대로 살린다.

- `viewer = { role: 'top' | 'operator', name, scopes: string[] | null }`
- `role === 'top'` → 전체 접근. 그 외 → `NAV`를 `scopes`로 필터링하고 `admin` 그룹은 무조건 제외.
- 권한 밖 URL 직접 진입 시 → 접근 가능한 첫 화면으로 리다이렉트.
- 운영자 계정으로 보고 있을 때 상단에 노란 배너(`aBg`/`warnBd`) + "최고 관리자로 돌아가기".

**구현**: `<RequireScope>` 라우트 가드 + `useScopedNav()` 훅. 스코프 값은 §5.1 표의 15개.

> ⚠️ 이건 **UI 게이팅일 뿐 보안이 아니다.** 실제 권한 검증은 서버에서 해야 한다. 현재 `viewer`가 localStorage에서 오므로 클라이언트에서 조작 가능하다. API 연동 시 세션 기반으로 교체.

---

## 11. 결정 내역

| # | 항목 | 결정 | 비고 |
|---|---|---|---|
| 1 | 도메인 상태값 표기 (§7.3) | **코드값 + 라벨 매핑** | `domain/<entity>/types.ts` 에 `'VISIBLE'` 등으로 정의, 한글은 같은 폴더의 `labels.ts`. 배지 tone 분기도 여기로 모았다 |
| 2 | 디자인 원본 | **커밋하지 않는다 (`design/` gitignore)** | 대신 **산출물**(`src/assets/icons`·`images`)을 커밋한다. 입력과 산출물을 둘 다 빼면 깨끗한 클론에서 `@/assets/icons` 가 없어 빌드가 안 된다 — 둘 중 하나는 저장소에 있어야 한다. 포팅·재생성이 필요하면 Claude Design 에서 내려받아 `design/` 에 두고 `bun run assets` |
| 3 | Pretendard | **CDN + SRI** | `/gh/` 경로는 GitHub **태그**를 서빙해서 태그가 옮겨지면 같은 URL 이 다른 내용을 준다. `integrity` 로 바이트를 고정했다(변조 시 브라우저가 차단하는 것까지 확인). ⚠️ SRI 는 CSS 만 덮고 그 CSS 가 부르는 **woff2 2.0MB 는 못 덮는다** — 완전히 닫으려면 self-host 여야 하고, 폐쇄망 요구와 함께 처리한다 |
| 4 | 나머지 20개 화면 | **착수 시점에 하나씩** | 지금은 라우트 + placeholder |
| 5 | 로그인 화면 | **구현됨** | 비밀번호 → TOTP 2단계 (§16) |
| 6 | 2단계 인증 등록 | **구현됨** | `/security`. 디자인 원본에 없어 새로 그렸다 (§16.3) |

### 아직 열려 있는 것

- **에셋 원본 재수급** — §8 상단 참고. `as_face_9` 하나가 비어 있다.
- **`bg` · `nest` · `growth` · `ach` · `emoji` 에셋** — 원본 파일에 없다. 형제 디자인 파일에 들어 있어 해당 화면 착수 시 함께 가져와야 한다.
- **권한 서버 검증** — 현재 뷰어는 localStorage 기반이라 UI 게이팅일 뿐이다 (§10).
- **컴포넌트 테스트가 없다** — `domain/` 순수 함수는 Vitest 로 덮었다(32개). 화면 테스트는 jsdom·Testing Library 결정이 먼저라 미뤘고, `vite.config.ts` 의 `test.include` 가 `.test.ts` 만 잡아 그 경계를 강제한다.
- **패스키(WebAuthn)** — §16.5. 비번+TOTP 를 대체하는 별도 경로로 붙인다. 비번 경로는 남긴다.
- **관리자가 다른 관리자의 2FA 를 리셋** (`/admins`) — 없으면 폰 잃은 사람이 영영 못 들어온다 (§16.5).

---

## 12. 현재 상태

**동작 확인됨** (`bun run typecheck` · `bun run build` 통과, 브라우저 렌더 확인)

- 셸: 사이드바(15그룹, 접힘 상태 저장) · 헤더 · 브레드크럼 · 탭바 · 테마 토글 · 뷰어 배너
- 지표 화면: KPI 6 · DAU 라인 차트 · 젬 유입·소비 바 차트 · 인기 아이템 TOP 5 · 진행 중 챌린지 달성률
- 라이트/다크 전환, FOUC 방지 포함
- 45개 화면 전부 라우트 등록 — 구현 2개(`dash` · `security`), 나머지 43개는 placeholder
- 탭 섹션 접힘 검증: `/items/3` 진입 시 탭은 "아이템 목록" 하나, 사이드바는 부모 항목 활성
- 번들 (**현재 수치의 단일 출처.** §9.2·§9.3 의 표는 결정 당시의 A/B 값이다): **첫 로드 143KB gzip** — 엔트리 + 공용 청크 + CSS. 화면은 라우트 단위 lazy 라 `DashboardPage` 111KB gzip(recharts 포함) · `SecurityPage` 10KB gzip 은 그 화면에 들어갈 때 받는다
- 에셋 SVG 50개는 개별 파일로 방출 — 대시보드 최초 로드에서 실제 요청은 **4건 / 22KB**
- **`design/` 없이도 클린 체크아웃에서 빌드된다** — 에셋 산출물을 커밋하기 때문 (임시 디렉터리에 `git checkout-index` 후 `bun install && bun run build` 로 검증)

- 레이어 순환 없음 — import 전수 스캔으로 확인했고, ESLint 로 강제한다 (§4.3 · §4.6)

**다음**

1. 에셋 원본 재수급 후 `bun run assets` 재실행 (`as_face_9` 복구, `nb3` 확인)
2. `shared/ui` 2단계 — Table · Pagination · EmptyState · Field/Input/Select · Segmented
3. 아이템 목록/상세 (`riruti-admin-items.dc.html`) — 필터를 `useSearchParams` 로 (§6.1)
4. 챌린지 · 회원 · 결제 순으로 확장

---

## 13. 타입 선언 규약

> **모든 타입 선언은 `type`. `interface`는 선언 병합이 필요한 곳에서만.**

`@typescript-eslint/consistent-type-definitions: ['error', 'type']` 로 강제한다. `**/*.d.ts` 만 예외다.

### 13.1 왜 `type` 인가

세 가지가 실사용에서 낫다.

- **hover 에 구조가 보인다.** `type X = { … }` 는 별칭 본문이 객체 리터럴이라 에디터가 필드를 펼쳐 보여준다. `interface X` 는 이름만 보여줘 정의로 이동해야 한다.
- **조합이 자유롭다.** `Pick` · `Omit` · 조건부 · 매핑 타입은 `type` 만 가능하다. 화면이 늘면 `Omit<Item, 'key'>` 같은 파생 타입이 반드시 필요해진다.
- **닫혀 있다.** `interface` 는 같은 이름을 다시 선언하면 병합된다 — 다른 파일에서 몰래 필드가 늘어날 수 있다. `type` 은 재선언이 에러다.

**검증하면서 정정한 것 두 가지**

| 흔한 통념 | 실제 (TS 6.0.3 로 확인) |
|---|---|
| "`interface` 는 에러 메시지에 이름이 보존되고 `type` 은 펼쳐진다" | **둘 다 이름만 나온다.** 차이 없음 |
| "`extends` 가 `&` 보다 빨라서 props 는 interface 여야 한다" | 이 프로젝트에선 **측정 차이 없음** (`tsc --noEmit` 0.89–1.20s → 0.90–1.03s). TS 공식 성능 가이드의 지적은 유효하지만 타입이 수천 개 규모일 때의 이야기다 |

`interface` 가 실제로 유리한 지점은 하나 남는다 — **충돌 조기 발견**:

```ts
type A = { id: string }
type B = { id: number }

interface IMerged extends A, B {}  // TS2320 — 선언 시점에 에러
type TMerged = A & B               // 조용히 통과. id 가 never 가 된다

declare const tm: TMerged
const x: string = tm.id            // 에러조차 안 난다 (never 는 string 에 할당 가능)
```

교차 타입은 충돌을 `never` 로 삼켜서 엉뚱한 곳에서 터진다. **서로 겹칠 수 있는 큰 타입 둘을 합칠 때는 주의**하고, 합친 뒤 필드가 `never` 가 아닌지 확인한다.

### 13.2 상황별

| 상황 | 선택 | 예 |
|---|---|---|
| 컴포넌트 props | `type` | `ButtonProps` `StatCardProps` |
| props + DOM 속성 | `type … & HTMLAttributes<…>` | `CardProps` `ButtonProps` |
| 도메인 엔티티 | `type` | `Item` `Challenge` `Viewer` |
| API 응답·요청 | `type` | `DashboardData` |
| 스토어 상태 | `type` | `ThemeState` `TabsState` |
| 리터럴 유니온 | `type` (선택 여지 없음) | `Slot` `Tier` `BadgeTone` |
| 튜플 | `type` (선택 여지 없음) | `RawRow` |
| 파생 타입 | `type` (선택 여지 없음) | `ScreenId = keyof typeof SCREENS` |
| **모듈·전역 확장** | **`interface`** (대체 불가) | 아래 |

### 13.3 유일한 예외 — 선언 병합

`type` 으로 표현할 방법이 아예 없다. 서드파티 타입 확장은 **`.d.ts` 에만** 두고, 거기서만 `interface` 를 쓴다.

```ts
// src/vite-env.d.ts
declare module 'vite/client' {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string
  }
}
```

환경변수 타입, react-router 의 타입 라우트 등록, styled-system 확장이 전부 이 방식이다. ESLint 는 `.d.ts` 에서 이 규칙을 끈다 — 다른 곳에 쓰면 잡힌다.

### 13.4 전환 결과

기존 `interface` 26건(props 11 · 도메인 엔티티 8 · 스토어 상태 4 · 기타 3)을 전부 `type` 으로 옮겼다. `eslint --fix` 가 `extends` 케이스(`Card` · `Button`)를 포함해 자동 변환했고, 타입체크·린트·빌드 모두 통과한다. 타입 레벨 변경이라 런타임 산출물은 바뀌지 않는다.

### 13.5 타입 전용 import 는 `type` 으로 표시한다

```js
'@typescript-eslint/consistent-type-imports': [
  'error',
  { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
]
```

두 가지 이유로 켠다.

- **런타임 import 가 남지 않는다.** 타입만 쓰는데 값 import 로 적으면 번들에 모듈이 딸려 들어간다. §4.3 의 레이어 그래프도 실제 의존만 반영하게 된다.
- `tsconfig` 의 `verbatimModuleSyntax: true` 와 짝이다. TS 는 import 를 **적힌 그대로** 내보내므로, 타입을 값처럼 import 하면 런타임에 없는 모듈을 찾다가 터진다. ESLint 가 이걸 컴파일 전에 잡는다.

**스타일** — 모듈이 무엇을 주느냐로 갈린다. 규칙이 강제하는 건 `type` 표시 여부뿐이고, 아래는 `fixStyle` 로 맞춘 관례다.

```ts
// 타입만 주는 모듈 → 문장 전체가 type import
import type { Kpi } from '@/domain/dashboard'

// 값과 타입을 같이 주는 모듈 → 문장 하나로 유지
import { SCREENS, type ScreenId } from '@/domain/screens'
```

같은 경로로 import 문이 두 개 생기는 걸 막는다. 도입 시점 기준 전자 20건 · 후자 14건으로 이미 이 패턴이었고, 규칙은 그걸 고정한 것이다.

> 켤 때 위반은 **0건**이었다 — `verbatimModuleSyntax` 가 이미 강제하고 있었기 때문이다. 즉 이 규칙은 코드를 바꾸려는 게 아니라, TS 설정을 바꿔도 관례가 무너지지 않게 잠그는 장치다.

---

## 14. 선언 순서

### 14.0 파일 단위 — 내보내는 것이 먼저

```tsx
const strip = css({ … })            // 1 모듈 상수 · 순수 헬퍼
export function TabBar() { … }      // 2 내보내는 것
function Row() { … }                // 3 이 파일 전용 하위 컴포넌트
```

파일을 여는 이유는 "이게 뭘 내보내는가" 다. 그게 첫 줄에 있어야 하고, 위에서 아래로
**추상 → 구체** 로 읽힌다. `TotpCard` 를 읽다가 `<DisablePanel/>` 이 궁금하면 그때
아래를 보면 되고, 안 궁금하면 안 봐도 된다. 반대 순서면 파일 이름이 가리키는 것을 찾는 데
스크롤이 필요하다.

**1번이 위인 건 취향이 아니다** — `const` 는 호이스팅되지 않는다. 반대로 **3번은 함수
선언이라 호이스팅되므로** 뒤에 둬도 안전하다. C/C++ 의 "정의가 사용보다 앞서야 한다"는
근거가 JS 에서는 성립하지 않는다.

그래서 **컴포넌트는 `function X()` 로 쓴다.** `const X = () => …` 로 쓰면 호이스팅이
사라져서 이 순서 자체를 쓸 수 없게 된다 — 두 규약은 한 몸이라 `check-order.ts` 가 같이 검사한다.

#### function 이냐 화살표냐

실제 기준은 "화살표 vs function" 이 아니라 **"한 줄 값이냐 여러 줄 로직이냐"** 다.
세어 보면 함수 안 화살표 216 · 최상위 `function` 94 · 최상위 화살표 19 이고,
그 19개가 예외 없이 한 줄짜리 변환·술어다.

| | 쓰는 것 |
|---|---|
| 함수 안 콜백·핸들러·셀렉터 | 화살표 (216곳) |
| **한 줄** 순수 변환·술어 | `export const isOnSale = (it: Item): boolean => …` (19곳) |
| **여러 줄** 로직 | `function` |
| **컴포넌트** | **`function` 만** — 검사가 강제한다 |

같은 파일에 둘이 나란히 있는 게 정상이다: `domain/item/rules.ts` 의
`isOnSale`(한 줄, 화살표)과 `topSelling`(여러 줄, function).

"한 줄이면 화살표" 쪽은 검사하지 않는다 — 줄 수로 세는 판정이 거칠어 오탐이 난다.

### 14.1 컴포넌트 안 순서

```text
1. 의존성 획득 훅        바깥에서 값을 가져온다
   1-1 라우터            useNavigate · useLocation · useParams · useSearchParams
   1-2 전역 스토어       useViewer · useTabsStore · useThemeStore
   1-3 서버 상태         useDashboard · useLogin (api 파사드 훅)
   1-4 로컬 상태         useState · useReducer
   1-5 참조              useRef · useKeepAliveRef
   1-6 반환값 없는 훅    useBeforeUnloadWhenDirty()
2. 계산                  1번에서 얻은 값으로 만든다
   2-1 평범한 파생값     const shown = tabs.filter(…)
   2-2 useMemo
   2-3 useCallback
3. 부수효과              useEffect · useLayoutEffect
4. 조기 반환             if (!x) return null
5. 핸들러                const onClose = (…) => { … }
6. return JSX
```

```tsx
export function TabBar() {
  const navigate = useNavigate()                    // 1-1
  const { pathname } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)          // 1-2
  const dirty = useDirtyStore((s) => s.dirty)
  const viewer = useViewer()

  const shown = tabs.filter((t) => canAccess(…))    // 2-1

  if (!shown.length) return null                    // 4

  const onClose = (path: string) => { … }           // 5

  return ( … )                                       // 6
}
```

**왜 이 순서인가** — 훅을 한 덩어리로 모으면 "이 컴포넌트가 무엇에 의존하는지"가 위 몇 줄만 봐도 드러난다.
파생값이 그 사이에 끼면 목록이 끊긴다.

### 14.2 `useMemo` · `useCallback` 이 1번이 아닌 이유

**앞서 얻은 값을 재료로 쓰기 때문에 순서상 앞설 수 없다.**

```tsx
const items = useItems()                                   // 1
const q = searchParams.get('q') ?? ''                      // 2-1  파생값
const filtered = useMemo(() => filterItems(items, q), [items, q])  // 2-2 ← q 보다 뒤여야 한다
```

`useMemo` 를 1번 그룹에 넣으면 `q` 를 인라인하거나 순서를 억지로 비틀어야 한다.
그래서 **훅을 두 종류로 나눈다**:

| | 성격 | 위치 |
|---|---|---|
| **의존성 획득 훅** | 지역 값을 인자로 받지 않는다. 밖에서 가져온다 | 1 |
| **계산 훅** (`useMemo` · `useCallback`) | 앞의 값을 재료로 쓴다 | 2 |
| **효과 훅** (`useEffect` 계열) | 계산이 끝난 뒤 실행한다 | 3 |

> 처음에는 `useMemo` 를 문서상 2번에 뒀는데 검사기가 1번으로 취급해 서로 어긋나 있었다. 검사기를 규약에 맞췄다.

### 14.3 `useMemo` · `useCallback` 은 기본이 아니다

**둘 다 쓰지 않는 것이 기본값이다.** 붙이는 순간 의존성 배열을 관리해야 하고, 배열이 틀리면
버그가 조용히 생긴다. 얻는 건 대개 측정되지 않은 이득이다.

붙이는 경우:

| | 조건 |
|---|---|
| `useMemo` | 계산이 실제로 비싸다 (수천 건 정렬·필터). **재보고 넣을 것** |
| `useMemo` | 참조 동일성이 필요하다 — 결과가 다른 훅의 의존성 배열에 들어간다 |
| `useCallback` | 넘기는 자식이 `React.memo` 로 감싸져 있다. 아니면 무의미하다 |

`const shown = tabs.filter(…)` 처럼 12개짜리 배열을 거르는 건 `useMemo` 를 쓸 이유가 없다.

### 14.4 강제 방법

| 위반 | 잡는 것 |
|---|---|
| 조기 반환 뒤에 훅 (4 → 1) | `react-hooks/rules-of-hooks` |
| **파생값 뒤에 의존성 획득 훅** (2 → 1) | `scripts/check-order.ts` |
| **useEffect 뒤에 의존성 획득 훅** (3 → 1) | `scripts/check-order.ts` |

두 번째·세 번째를 잡는 표준 ESLint 룰이 없어서 직접 만들었고 `bun run lint` 에 물려뒀다.
정규식 휴리스틱이라 오탐 여지가 있다 — **정당한 예외가 반복해서 걸리면 검사기가 아니라 규약을 고칠 것.**

---

## 15. import 정렬

### 15.1 그룹 순서 — 레이어를 따른다

```text
react                        react · react-dom
external                     react-router · @tanstack/* · axios · zustand · recharts
styled-system                Panda 코드젠 산출물

@/assets                     ── 여기부터 우리 코드. §4.3 의 의존 그래프 순서
@/shared
@/domain
@/mocks
@/api
@/stores
@/layouts
@/features
@/app

./ ../                       상대경로
```

그룹 사이에 빈 줄 하나를 넣는다. **목록을 위에서 아래로 읽으면 이 파일이 어느 층에 의존하는지 그대로 보인다.**
ESLint 가 이미 잘못된 방향을 막고 있으므로(§4.6), 정렬된 목록은 자연히 "아래층 → 위층" 이 된다.

```tsx
import { NavLink, useNavigate } from 'react-router'

import { css } from 'styled-system/css'

import { Icon } from '@/shared/ui/Icon'

import { groupOf, type NavGroup } from '@/domain/nav'
import { LOGIN_PATH, SCREENS, sectionOf } from '@/domain/screens'

import { useNavStore } from '@/stores/navStore'
import { useViewer, useViewerStore } from '@/stores/viewerStore'

import { useCurrentScreen, useScopedNav } from './useScopedNav'
```

그룹 안에서는 **알파벳 순**이다. 사람이 정할 게 없어야 다툼이 없다.

### 15.2 타입 import 은 합친다

```ts
import { groupOf, type NavGroup } from '@/domain/nav'   // ✓ 한 문장
import type { NavGroup } from '@/domain/nav'            // ✗ 값 import 이 따로 있으면 중복
import { groupOf } from '@/domain/nav'
```

모듈이 타입만 주면 `import type { Kpi } from '@/domain/dashboard'`, 값과 타입을 같이 주면 한 문장(§13.5).

### 15.3 강제 방법

| | 룰 |
|---|---|
| 그룹 순서 · 알파벳 · 빈 줄 | `perfectionist/sort-imports` (**`--fix` 자동**) |
| 같은 모듈 두 번 import | `no-duplicate-imports` |
| 타입 전용은 `type` 표시 | `@typescript-eslint/consistent-type-imports` |

**전부 자동 수정됩니다** — `bunx eslint . --fix`.

> 도입 시 위반 97건이 자동으로 정리됐고, 타입/값이 갈라져 있던 3곳(`mocks/items` · `mocks/challenges` · `Sidebar`)은
> 손으로 합쳤다. `perfectionist` 는 정렬만 하고 문장을 합치지는 않는다.

---

## 16. 인증

### 16.1 로그인은 두 경로다

```text
① 비밀번호 → TOTP 코드      어디서든. 낯선 기기·새 노트북
② 패스키                     등록한 기기. 한 번에        ← 미구현
```

②만 남기면 **기기를 잃은 순간 아무도 못 들어온다.** 운영자는 로그인하는 위치와 기기가
계속 바뀌므로 ① 을 반드시 남긴다. 반대로 ① 만 두면 낯선 기기에서 매번 코드를 꺼내야 한다.
GitHub 이 두 경로를 다 열어 두는 이유와 같다.

**세션은 2차까지 통과해야 열린다.** 1차만으로 들여보내면 2FA 가 무의미하다.
1차 응답의 `challenge` 는 일회용이라 컴포넌트 state 에만 두고 저장하지 않는다.

디자인 원본의 OTP 화면은 **이메일 발송 방식**이라 3분 타이머와 "코드 다시 받기" 가 있었다.
TOTP 는 인증 앱이 30초마다 스스로 코드를 바꾸므로 **보낼 것도 만료시킬 것도 없다** — 둘 다 뺐다.
대신 **백업 코드** 경로를 넣었다.

### 16.2 도메인 경계 — `access.ts` 와 `totp.ts`

| | 담는 것 |
|---|---|
| `domain/access.ts` | **인가** — 누가 무엇을 볼 수 있나 (`Viewer` · `canAccess` · `visibleNav`) |
| `domain/totp.ts` | **인증 수단** — 2단계 인증을 어떻게 켜고 검증하나 |

둘은 같이 바뀌지 않는다. 스코프가 하나 늘어난다고 TOTP 규칙이 바뀌지 않고, 그 반대도 아니다.

`totp.ts` 가 담는 건 **화면이 필요로 하는 표현 규칙뿐**이다 — QR 에 담을 URI, 읽기 쉬운
시크릿 표기, 백업 코드 파일 내용. 코드 생성·검증은 서버 몫이다.

### 16.3 TOTP 등록 (`/security`)

```text
발급          POST /admin/me/totp/enroll     → { secret, account }   아직 계정에 반영 안 됨
  ↓  1단계    QR 스캔 (또는 키 직접 입력)
확인          POST /admin/me/totp/confirm     → 백업 코드 10개        여기서 실제로 켜진다
  ↓  2단계    앱에 뜬 6자리 입력
보관          백업 코드 표시 — 한 번뿐
```

세 가지 결정이 이 흐름을 만든다.

**① 확인 단계는 건너뛸 수 없다.** 발급 즉시 켜면 QR 을 잘못 스캔한 사람이 그대로 잠긴다.
앱이 실제로 맞는 코드를 내는지 본 뒤에야 계정에 반영한다.

**② 시크릿은 마법사가 스스로 발급하지 않는다.** 버튼을 실제로 누른 순간 한 번만 발급하고
prop 으로 넘긴다. 마운트 시 발급하면 "켜기" 를 눌렀다 닫을 때마다 서버에 쓰레기가 쌓인다.

**③ 백업 코드는 확인을 통과한 뒤에 준다.** 시작 단계에서 주면 중간에 그만둔 사람이
켜지지도 않은 수단의 코드를 들고 있게 된다.

**QR 은 테마를 따르지 않는다.** 어두운 배경에 검은 모듈을 그리면 스캐너가 못 읽는다.
여백(quiet zone)까지 흰색이어야 해서 흰 카드를 통째로 깔고 그 위에 그린다 — 이 화면에서
`#FFFFFF` / `#000000` 하드코딩은 의도된 것이다.

**시크릿을 텍스트로도 보여준다.** 데스크톱 인증 앱에는 카메라가 없다. 4자씩 끊고
(`groupSecret`) `mono` 폰트 토큰으로 찍는다 — 32자를 한 줄로 두면 옮겨 적다가 반드시 틀린다.

> **`otpauth://` URI 함정** — `URLSearchParams` 는 공백을 `+` 로 쓴다(폼 인코딩).
> Key URI 규격은 퍼센트 인코딩이라 그대로 두면 발급자가 "리루티+운영+어드민" 으로 뜨는 앱이 생긴다.
> 라벨과 `issuer` 파라미터를 **둘 다** 넣는 것도 같은 이유 — 앱마다 읽는 곳이 다르다.

### 16.4 백업 코드는 한 번만 보여준다

서버는 해시만 갖고 있어서 되돌려 줄 방법이 없다. 그래서 "다시 보기" 가 아니라 **재발급**이고,
재발급하면 이전 코드는 그 즉시 전부 무효다.

그 무게를 UI 로 표현한다:

- 보관 확인 체크 전에는 **완료 버튼이 잠긴다**
- 확인 전까지 이 탭을 **미저장으로 표시**한다 (`useUnsavedGuard`) — 탭 스트립의 ● 와
  새로고침 경고가 붙는다. keep-alive 는 새로고침을 못 견디므로 여기서 새로고침하면 코드가 사라진다
- 파일에는 코드만 적지 않는다. 어느 서비스·어느 계정인지와 "한 번씩만 쓸 수 있다"를 같이 적는다
  (`backupCodesText`) — 몇 달 뒤에 열었을 때 무슨 코드인지 알 수 없으면 소용이 없다

**해제는 현재 코드를 요구한다.** 확인 창 한 번으로 끌 수 있으면, 자리를 비운 사이 누구나
2단계 인증을 걷어내고 비밀번호만으로 들어올 수 있다. 그러면 켜 둔 의미가 없다.

### 16.5 `me` 스코프

`/security` 의 스코프는 `me` 이고 **`canAccess` 가 무조건 통과시킨다.** 스코프가 하나도 없는
사람도 자기 계정의 2단계 인증은 켤 수 있어야 한다.

그래서 **`NAV` 에 넣지 않는다** — 사이드바 그룹은 권한 스코프 단위인데 자기 계정 설정은
권한과 무관하다. 사이드바 하단 프로필을 누르면 열린다.

### 16.6 아직 안 만든 것

| | 왜 |
|---|---|
| 패스키(WebAuthn) | 2차 수단이 아니라 **비번+TOTP 를 통째로 대체하는 별도 경로**로 붙인다 — 패스키 자체가 이미 다요소다. Conditional UI (`autocomplete="username webauthn"`) 로. 비번 경로는 남긴다 |
| 관리자가 다른 관리자의 2FA 리셋 (`/admins`) | 없으면 폰 잃고 백업 코드도 잃은 사람이 영영 못 들어온다 |
| 비밀번호 재설정 | 지금은 비활성 텍스트. 발송·검증 엔드포인트가 필요하다 |
| `getSession()` 부팅 시 호출 | 실서버를 붙이면 새로고침마다 세션을 서버에 확인해야 한다. 지금 스토어 값은 **서버 세션의 캐시**일 뿐이다 |

---

## 17. 주석

주석이 전체의 **19%** 다 (JSDoc 988줄 + 줄주석 148줄). 많은 편인데 잡음이 아닌
이유는 자리마다 답하는 질문이 다르기 때문이다.

> **19% 는 결과지 목표가 아니다.** 비율을 목표로 잡으면 채우기 위한 주석이 생기고,
> 그건 아래 §17.5 가 금지하는 것들이다. 재는 이유는 "이 정도면 과한가"를 스스로
> 점검하기 위해서지 맞추기 위해서가 아니다.

### 17.1 첫 줄은 무엇, 그 뒤는 왜

선언에 붙는 JSDoc 251개 중 **135개가 한 줄**이고, 여러 줄인 116개는 **112개가
첫 줄에 짧은 정의를 두고 빈 줄 뒤에 이유를 쓴다.**

```ts
/**
 * 1차 인증(비밀번호).                        ← 무엇 (한 줄)
 *                                            ← 빈 줄
 * 2FA 가 켜진 계정이면 여기서 끝나지 않고     ← 왜 · 어기면 무엇이 깨지나
 * `totp_required` 와 challenge 를 돌려준다.
 * 세션 쿠키는 **2차까지 통과해야** 심긴다 —
 * 1차만으로 들어올 수 있으면 2FA 가 무의미하다.
 */
```

첫 줄만으로 충분하면 거기서 끝낸다 — `/** 보유율 (%) */` 처럼.

**반대로 줄 주석(`//`)은 "왜"만 쓴다.** 무엇인지는 바로 아래 코드가 말한다.

```ts
// ✗ 코드가 이미 말하는 것
setDirty(path, dirty)   // dirty 상태를 설정한다

// ✓ 코드가 말하지 않는 것
// 말줄임은 `max-width: 0` 이어야 표 안에서 동작한다.
maxWidth: c.truncate ? 0 : undefined,
```

판별법: **주석을 지웠을 때 잃는 것이 있는가.** 없으면 쓰지 않는다.

### 17.2 `//` 와 `/** */` — 자리가 정한다

**hover 에 떠야 하는 자리는 `/** */` 다.** 취향이 아니라 도구의 동작이다.
`tsc --declaration` 으로 재보면 `//` 는 사라지고 `/** */` 만 `.d.ts` 에 실린다 —
hover(quickinfo)가 읽는 것이 그 경로다.

```ts
// 줄 주석 — 선언 바로 위      →  .d.ts 에 없음 → hover 에 안 뜸
/** JSDoc — 선언 바로 위 */    →  .d.ts 에 그대로 실림
```

| 자리 | 형태 |
|---|---|
| 파일 머리말 | `/** */` |
| 최상위 선언 (`function` · `const` · `type` …) 바로 위 | `/** */` |
| 타입 필드 바로 위 | `/** */` |
| 그 외 — 문 사이 · 표현식 옆 | `//` |
| **JSX 안** | `{/* */}` — JSX 에서 `//` 는 주석이 아니라 **화면에 그대로 렌더된다** |

**본문 안에서는 `/** */` 를 쓰지 않는다.** 어떤 선언에도 붙지 않아 hover 에 절대
안 나오는데 줄만 세 배가 된다. `@` 를 태그로 해석하려는 문제도 생긴다.

### 17.3 언어와 상호참조

**한국어로 쓴다.** 코드·타입·라이브러리 이름은 원문 그대로 둔다 — `useEffect`,
`SameSite=None`, `LocalDate` 를 번역하면 검색이 안 된다.

**문서 참조는 `(§4.4)` 로 짧게 쓴다.** 이 저장소에서 `§` 는 `docs/ARCHITECTURE.md`
하나를 가리킨다. 파일 머리말에서 처음 한 번만 전체 경로를 적고, 같은 파일 안에서는
번호만 쓴다.

```ts
/**
 * …
 * (docs/ARCHITECTURE.md §8)   ← 파일 안에서 처음
 */

// 두 번째부터는 (§8)
```

### 17.4 어디에 다는가

**파일마다 앞부분(첫 30줄)에 설명이 하나는 있어야 한다.** 자리는 상관없다 — 그
파일을 처음 여는 사람이 "여기가 무엇을 하는 곳인지"를 스크롤 없이 알면 된다.

**컴포넌트가 하나인 `.tsx` 는 컴포넌트 JSDoc 에 몰고 파일 머리말을 생략한다.**
둘 다 쓰면 같은 말이 두 번 적힌다. 반대로 여러 개를 내보내거나(`Card`/`CardTitle`),
규칙·상수 모음이면 파일 머리말이 맞는 자리다.

**모듈 상수·스타일에도 이유가 있으면 단다.** `shared/ui/OtpInput.tsx` 의 `cell`
스타일에 "왜 `focused` state 를 두지 않았는가"가 붙어 있는 것처럼.

### 17.5 마커

**`⚠️` — 어기면 조용히 깨지는 것.** 줄 첫머리에 놓고 첫 문장은 굵게 결론부터 쓴다.
한 블록에 여러 개면 각각 `⚠️` 로 시작하고 이어지는 줄은 들여쓴다.

```text
⚠️ 살아 있다는 건 `useEffect` cleanup 이 안 돈다는 뜻이다.
   폴링·구독은 `useEffectOnActive` 로 감싸 비활성 탭에서 멈추게 할 것.
⚠️ 메모리에만 있어서 새로고침하면 사라진다.
```

컴파일러도 린트도 못 잡고, 지우면 며칠 뒤 이상한 증상으로만 드러나는 것에 쓴다.
"주의하세요" 수준이면 그냥 평범한 주석이다.

**`TODO(조건):` — 조건을 괄호에 적는다.** 조건 없는 TODO 는 영원히 남는다.

```ts
// ✓ TODO(백엔드 스펙 확정 후): 서버 DTO 필드명이 다르면 여기서 매핑한다
// ✓ TODO(eslint-plugin-jsx-a11y 가 ESLint 10 을 지원하면): lint 에 넣는다
// ✗ TODO: 나중에 고치기
```

### 17.6 테스트

`it('음수 N 은 0 으로 다룬다')` 처럼 **이름이 곧 설명**이라 기본은 달지 않는다.
"왜 이 경계인가"가 자명하지 않을 때만 쓴다 — 대부분 **실제로 났던 버그**를
고정하는 자리다.

```ts
/**
 * `new Date(y, m, d)` 는 범위를 벗어난 값을 거부하지 않고 **굴린다**
 * (`2026-02-31` → 3월 3일). 그러면 "파싱 못 하면 원문" 계약이 깨진다.
 * 타임존을 고치다 실제로 한 번 깨뜨린 자리라 여기서 고정한다.
 */
it('없는 날짜는 굴리지 않고 원문을 돌려준다', () => { … })
```

**스위트가 환경에 의존하면 `describe` 위에 반드시 적는다.** 안 적으면 다른 곳에서
깨졌을 때 원인을 찾는 데 오래 걸린다 (`format.test.ts` 의 TZ 고정이 그 예다).

### 17.7 쓰지 않는 주석

| | 왜 |
|---|---|
| 코드를 그대로 옮긴 것 (`// i 를 1 증가`) | 코드가 이미 말한다. 코드가 바뀌면 거짓말이 된다 |
| 구획 배너 (`// ===== 핸들러 =====`) | 선언 순서 규약(§14)이 이미 자리를 정한다 |
| 변경 이력 (`// 2026-08-20 김하늘 수정`) | git 이 한다 |
| 주석 처리한 코드 | git 이 한다. 지운다 |
| 타입 이름을 되풀이하는 것 (`@param id 화면 id`) | `id: ScreenId` 로 충분하다. 다만 **타입이 말하지 못하는 것**은 반드시 쓴다 → §17.8 |

### 17.8 타입이 말하지 못하는 것 — 서버 계약

`string` 은 **형식·단위·누가 정하는지·언제 없는지**를 말하지 못한다. 그건 서버와의
약속이고, 안 적으면 코드를 읽는 사람이 추측한다.

이번 프로젝트에서 이게 없어서 실제로 깨진 적이 있다. `date()` 가 `'2026-03-14'` 를
UTC 자정으로 읽고 있었는데, **Spring 의 `LocalDate` 가 정확히 그 모양으로
직렬화된다**는 사실이 어디에도 적혀 있지 않았다. 한국(UTC+9)에서는 드러나지 않아
실서버를 붙이는 순간 나타날 종류였다.

| 무엇 | 안 적으면 | 예 |
|---|---|---|
| **형식** | 파싱을 추측한다 | `/** ISO 8601. 꺼져 있으면 null */` · `/** base32 */` |
| **단위** | 100 이 퍼센트인지 개수인지 모른다 | `/** 보유율 (%) */` |
| **`null`·`0` 의 뜻** | "없음"과 "0"이 구분되지 않는다 | `/** 젬 가격. **무료면 0** */` |
| **누가 정하는가** | 클라이언트가 정하려 든다 | `keepSignedIn` — "**결정은 서버가 한다**" |
| **수명·1회성** | 저장해도 되는 줄 안다 | ``/** `login()` 이 준 **일회용** 토큰 */`` |

**아직 정해지지 않은 계약도 적는다.** 비워두면 나중에 누군가 임의로 채운다.

```ts
/** 달성 조건 (조건 코드 체계는 서버 스펙 확정 후) */
condition: string
```

> 반대로 **서버가 우리보다 먼저 바뀔 수 있다는 것**도 계약이다. `isViewer` 가
> 스코프 문자열이 아는 값인지 검사하지 않는 이유가 주석에 있다 — 검사하면 서버가
> 새 스코프를 추가할 때 배포 순서에 결합이 생긴다.

### 17.9 강제 방법

"왜를 쓴다"는 기계가 못 본다. **자리와 형식은 볼 수 있다.**

| | 무엇을 |
|---|---|
| `scripts/check-comments.ts` | ① 파일 앞 30줄에 설명이 있는가 ② 최상위 선언·타입 필드 위의 `//` (JSDoc 이어야 한다) ③ `TODO` 에 조건이 붙었는가 ④ 파일의 첫 문서 참조가 전체 경로인가 |

> 나머지는 리뷰의 몫이다. 문서에만 있는 규칙은 새어 나가지만(§14·§15 가 그래서
> 스크립트를 갖는다), **판단이 필요한 규칙까지 기계로 밀면 오탐이 규칙을 죽인다.**

**판정부는 픽스처로 테스트한다.** `check-comments.ts` 는 파일을 모아 넘기기만 하고,
실제 판정은 `scripts/comment-rules.ts` 의 순수 함수들이 한다 —
`comment-rules.test.ts` 가 그것을 잡는다.

가른 이유는 이 검사기가 **코드를 읽는 코드**라서다. 자기가 맞게 읽고 있는지를
눈으로 확인할 방법이 없고, 실제로 세 번 틀렸다.

### 17.10 문서가 코드와 어긋나는 것

`scripts/check-docs.ts` 가 `bun run lint` 에서 넷을 본다.

| | 무엇을 | 무엇을 잡았나 |
|---|---|---|
| 파일 경로 | 백틱 안의 `src/` · `scripts/` · `docs/` 경로가 실재하는가 | 파일을 옮기고 문서를 안 고친 것 |
| `§` 참조 | 가리키는 절이 있는가 | 절을 재번호 매기고 참조를 남긴 것 |
| 절 번호 | 같은 번호가 두 번 나오지 않는가 | **제목만 갈아 끼우고 옛 본문을 남긴 것** |
| 호출 예시 | `` `f(a, b)` `` 의 인자 수가 실제 시그니처와 맞는가 | 시그니처를 바꾸고 예시를 남긴 것 |

**왜 만들었는가** — 문서가 스스로/코드와 어긋난 게 세 번 반복됐다.

1. §19.4.1 의 「모든 종이 같은 몸을 쓴다」 — 모루가 「통통한 몸」 을 쓴다
2. react-query 기본값 — 한 곳을 고치고 그 짝을 남겼다
3. 인자가 둘로 바뀐 뒤에도 남아 있던 호출 예시

```text
✗ summarize(all)              문서에 남아 있던 것
✓ summarize(all, today())     실제 시그니처
```

셋 다 **한 곳을 고치고 그 짝을 남긴다**는 같은 모양이다. 세 번 되풀이했으면 사람에게
맡길 일이 아니다.

> ⚠️ **틀린 예시는 펜스 안에 쓴다.** 인라인 백틱(`` `f(a)` ``)은 "이렇게 부른다" 는 뜻이라
> 검사가 실제 시그니처와 대조한다 — 잘못된 예를 그 형태로 쓰면 **검사가 자기 문서를
> 잡는다**(실제로 이 절을 쓰다 걸렸다). §18.8 의 ✗/✓ 예시가 이미 그 방식이다.

⚠️ **1번은 이 검사가 못 잡는다.** 「모든 종이 같은 몸」 은 **데이터를 두고 하는 주장**이라
형식으로는 판정할 수 없다 — 그건 리뷰의 몫으로 남는다. 검사가 보는 것은 *형식*뿐이고,
그 경계를 넓히려 들면 오탐이 규칙을 죽인다(§17.9).

**오탐을 줄이려 뺀 것들** — 처음 재봤을 때 「어긋남」 6건 중 5건이 오탐이었다.

- **인자 없는 언급**(`` `date()` ``)은 호출 예시가 아니다. 이 문서는 함수를 이름으로
  부를 때 그 형태를 쓴다
- **글롭·자리표시자**(`src/api/*.ts` · `features/<name>/`)와 **디렉터리**는 경로 검사에서 뺀다 —
  아직 만들지 않은 폴더를 가리키는 경우가 정상적으로 있다
- **이름이 겹치면서 인자 범위가 다른 함수**는 대조하지 않는다. 어느 쪽인지 모르는 것을 틀렸다고
  말하면 안 된다. 범위가 같으면 어느 쪽이든 답이 같으므로 그대로 본다
- 인자 수는 **중첩을 존중해** 센다. `saveItem({ itemId, input })` 은 하나다

판정은 `scripts/doc-rules.ts` 에 있고 픽스처로 테스트한다 — §17.9 와 같은 이유다.

| 오탐·누락 | 원인 |
|---|---|
| `const LABEL = 'TODO: …'` 를 위반으로 잡음 | 줄 전체에서 `TODO` 를 찾음 |
| 템플릿 리터럴 안의 `// TODO:` 를 주석으로 봄 | 여러 줄에 걸친 문자열 상태를 안 봄 |
| `// TODO: 급함; TODO(조건): 나중` 이 통과 | 주석당 한 번만 검사 |

셋 다 픽스처 한 줄이면 잡혔을 것들이다. **오탐이 규칙을 죽인다면, 검사기의 오탐은
검사기를 죽인다** — 그래서 `vite.config.ts` 의 `include` 가 `scripts/` 까지 본다.

---

## 18. 목록 화면

아이템 목록(`features/items`)이 첫 목록 화면이다. 나머지 20여 개가 같은 모양을 따른다.

### 18.1 주소가 원본이다

필터·쪽·뷰를 컴포넌트 state 에 두지 않는다. keep-alive 가 화면을 살려 두지만
**새로고침과 링크 공유는 URL 만 살린다**(§6.3). "이 조건으로 걸러진 화면"을 남에게
보내지 못하면 운영 도구로서 반쪽이다.

```text
/items?q=로브&slot=BODY&tier=PAID&view=grid&page=3
```

변환은 **순수 함수로 갈라 둔다**(`features/items/query.ts`). 훅은 jsdom 이 없어 못
돌리지만 `URLSearchParams` 는 node 표준이라 그 부분은 테스트가 된다.

| | |
|---|---|
| `parseItemsQuery(params)` | 주소 → 화면 상태 |
| `toSearchParams(query)` | 화면 상태 → 주소 |
| `patchQuery(cur, patch)` | 바뀐 것을 얹는다 |

⚠️ **모르는 값은 버린다.** URL 은 남이 고치고 북마크는 오래 산다 — `?slot=WING` 이나
`?view=hologram` 이 화면을 깨뜨리면 안 된다. 재서 확인: 모르는 값 다섯 개를 한꺼번에
넣어도 전부 기본값으로 떨어지고 50건이 그대로 뜬다.

⚠️ **기본값은 주소에 적지 않는다.** `view=list&page=1&q=` 를 매번 쓰면 첫 진입부터
주소창이 지저분해지고, 링크를 복사했을 때 조건이 걸린 것처럼 보인다. 공백뿐인
검색어도 마찬가지다 — 거르는 쪽이 어차피 무시하는데 주소에만 `?q=+++` 가 남는다.

⚠️ **입력창을 주소에 직접 매지 말 것.** 매 타건이 주소를 한 바퀴 돌아오는데 주소는
값을 그대로 보관하지 않는다(기본값·공백뿐인 값은 안 적는다). 그러면 **친 글자가 화면에서
사라진다.** 이 화면에서 같은 버그를 세 번 만났다.

| 친 것 | 사라진 것 | 원인 |
|---|---|---|
| `왕실 벨벳` | 가운데 공백 | `parse` 가 `trim()` 했다. **치는 도중에는 그게 끝 공백이라** 털린다 — `trim()` 은 양끝만 털지만 한 글자씩 왕복하면 가운데도 결국 없어진다 |
| `␣왕실 벨벳` | **앞** 공백 | 공백뿐인 값이 주소에 안 실려 첫 글자가 증발 |
| `␣␣␣` (검색어 지우려고) | 친 공백 전부 | 우리가 쓴 값과 주소에서 돌아온 값이 달랐다 |

**초안은 화면이 들고, 주소에는 조용해졌을 때만 쓴다**(`useSearchDraft`, 250ms).
곁들여 매 타건마다 라우터를 다시 그리는 것도 없어진다. 다듬는 것은 **주소에 쓸 때**와
**거를 때**(`filterItems`)만 한다.

초안과 주소를 잇는 규칙은 **하나**다 — `committedSearch(q)`, "이 값을 쓰면 주소에서
무엇이 돌아오는가"(공백뿐이면 빈 문자열). 양쪽이 같은 함수를 본다.

- **써 봐야 주소가 같은 값이면 쓰지 않는다.** `'   '` 을 반복해서 쓰는 무한 반복을 막는다.
- **우리가 쓴 것이 그대로 돌아온 것이면 초안을 덮지 않는다.** 그 외에는 밖에서 바뀐 것이다.

⚠️ **"다듬어서 같으면"으로 판단하면 안 된다.** 그러면 `왕실` → `왕실␣` 처럼 끝 공백만
더한 편집이 주소에 반영되지 않아 **입력창과 주소가 어긋나고**, 공백만 다른 주소로
앞뒤 이동해도 입력창이 안 따라온다. 기준은 `trim()` 이 아니라 `committedSearch` 다.

⚠️ 이 보정은 **효과가 아니라 렌더 중에** 한다. 효과 안에서 `setState` 하면 화면을 한 번
그린 뒤 다시 그리게 되고(연쇄 렌더) ESLint 가 잡는다.

### 18.2 필터를 바꾸면 1쪽으로

5쪽을 보다가 슬롯을 걸었는데 결과가 2쪽뿐이면 **빈 화면이 뜬다.** 목록 화면에서 가장
흔한 버그라 `patchQuery` 가 아예 못 하게 막는다 — 쪽 말고 무엇이든 바뀌면 `page` 가 1이다.

### 18.3 히스토리는 쪽 이동만 쌓는다

쪽을 넘긴 뒤 뒤로가기가 이전 쪽으로 가야 한다. 그러나 검색어까지 쌓으면 한 글자마다
항목이 생겨 **뒤로가기 열 번을 눌러야 목록을 벗어나게** 된다. 그래서 쪽은 `push`,
나머지는 `replace`.

### 18.4 쪽은 파사드가 자른다

```ts
getItems({ ...filter, page, perPage }) → { items, total }
```

화면은 `slice` 하지 않는다. 실서버는 한 쪽만 내려주므로 **지금부터 이 모양이어야**
나중에 화면을 안 건드린다. `total` 은 지금 쪽의 개수가 아니라 **필터에 걸린 전체**다 —
페이지 바가 그걸 쓴다.

⚠️ **`placeholderData: keepPreviousData` 를 빼지 말 것.** 쪽을 넘길 때마다 결과가
`undefined` 가 되어 표가 스켈레톤으로 깜빡인다. 재서 확인: 넣은 상태에서 쪽을 넘기면
행 수가 12에서 한 번도 변하지 않는다.

### 18.5 화면 조립

```text
PageHeader            제목 · 설명 · 우측 액션
Card(필터 바)          검색 · Segmented 들 · 총 건수 · 뷰 토글
Table | Grid | Empty   셋 중 하나
Pagination            page · perPage · totalItems
```

- **`Table` 을 `Card` 로 감싸지 않는다.** 표가 이미 카드 테두리를 갖고 있어 이중이 된다.
- **`Pagination` 에 넘기는 `page` 를 미리 자르지 않는다.** 안에서 `clampPage` 한다(§9).
- **행 안에 버튼을 넣지 않는다.** 원본은 행마다 「상세」 버튼이 있었지만, 클릭 가능한 행
  안에 또 버튼을 두면 포커스가 두 번 걸리고 스크린리더가 행과 버튼을 따로 읽는다.
  `Table` 의 `onRowClick` 이 `tabIndex`·Enter/Space·포커스 링을 이미 준다.
- **그리드 타일은 `<button>`** 이다. 원본은 `<div onClick>` 이라 Tab 으로 닿지 않았다.
  이름이 앞서도록 `aria-label` 을 직접 준다 — 그냥 두면 DOM 순서대로
  "무료 밀짚모자 머리 무료" 로 읽혀 훑을 수가 없다.
- 라벨·배지 색은 전부 `domain/<entity>/labels.ts` 를 거친다. 한글을 화면에 직접 쓰지 않는다.

⚠️ **오류와 "결과 없음"을 겹쳐 놓지 말 것.** 조회가 실패해도 `isPending` 은 false 이고
결과는 빈 배열이라, 그냥 두면 오류 배너 아래에 "조건에 맞는 아이템이 없습니다" 가 같이
뜬다 — **걸러서 없는 것과 못 불러온 것이 구분되지 않는다.** 같은 이유로 건수도
`총 0건` 이 아니라 `총 —` 이다. 갈림길은 `data === undefined` 다. 데이터가 있는 채로
재조회만 실패했다면 이전 결과를 그대로 두는 게 맞다(배너가 따로 알린다).

### 18.6 상세 화면

목록에서 행을 눌러 들어가는 화면. **탭은 늘지 않고 같은 탭에서 화면만 바뀐다**(§6.3).

**파사드가 한 번에 준다.** 표·차트·이력을 따로 부르지 않는다 — 한 화면이 한 번만
기다리면 되고, 서버도 아이템 하나를 조회하는 김에 딸린 것을 같이 주는 편이 자연스럽다.

```ts
getItem(itemId) → { item, trend, ledger, favorites, returned }
```

**없는 id 는 던진다.** 북마크·잘못 친 주소로 들어올 수 있다.
`apiError('http', …, 404)` 로 던지면 화면이 오류로 다룬다 — 빈 상태와 겹치지 않는다(§18.5).

⚠️ **도메인에 없는 값은 파사드가 만든다.** `즐겨찾기`(판매×0.34)·`반환`(0건)은 원본이
계산해 쓰던 것이라 `Item` 에 없다. 도메인 규칙이 아니므로 `domain/` 에 넣지 않고
`ItemDetail` 에 담아 `TODO(백엔드가 정의하면)` 를 붙였다.

> **퍼블리싱 동안 데이터는 전부 목이다.** 원본의 계산식을 그대로 옮긴다.
> §18.7 의 "동작하지 않는 버튼은 잠근다"는 **상호작용**에 대한 규칙이지 수치가 아니다.

⚠️ **「수량」이 무엇을 세는지 적을 것.** 착용 아이템은 한 계정에 하나뿐이라
"한 사람이 21개 받음" 같은 건 없다 — 이 숫자는 **몇 계정에 나갔는가**다. 그래서
대상이 개별 계정이면 언제나 1 이고, `전체 유저` 같은 세그먼트일 때만 규모가 생긴다.
열 이름도 「수량」이 아니라 「계정 수」로 뒀다.

> 처음에 대상을 항상 개별 계정으로 두고 수량만 굴렸다가 "왕관 21개"가 나왔다.
> 원본은 `who: '전체 유저' | 'u_10240'`, `qty: 100.. | '1'` 로 이미 이 규칙이었다 —
> 데이터를 안 보고 열 이름만 보고 옮긴 탓이다.
>
> `LedgerEntry` 를 재화(젬) 원장이 재사용하면 거기서는 같은 필드가 **계정당 금액**이
> 된다. 뜻이 바뀌는 자리라 화면마다 열 이름을 정확히 붙인다.

⚠️ **차트 축은 순수 함수로 뗀다**(`features/items/trend.ts`). 폭이 0 이면 선이
납작해지고 여유가 없으면 꼭짓점이 잘리는데, 눈으로는 "그냥 그런 그래프"로 보인다.
새로 만든 아이템은 8주 내내 값이 같아서 실제로 폭 0 이 나온다.

**원본에서 고친 것 둘.**

| | |
|---|---|
| 미리보기 카드에 상한(`maxWidth: 380px`) | 정사각이라 폭이 커지는 만큼 세로도 길어져, 넓은 화면에서 왕관 하나가 400px 넘게 차지하고 오른쪽 단이 표보다 좁아졌다 |
| 이력 표 `minWidth` 760 → 700 | 열 폭의 합이 690 이라 41px 때문에 가로 스크롤이 걸렸다 |

---

### 18.7 폼 화면

등록·수정은 **한 화면**이다(`ItemFormPage`). `useParams().itemId` 유무로 갈리고,
파사드도 `saveItem({ itemId?, input })` 하나다 — 부르는 쪽이 갈라질 이유가 없다.

**검증 규칙은 도메인에 둔다**(`validateItem`). 화면은 그 결과를 두 군데에 쓴다.

⚠️ **체크리스트와 필드 오류가 같은 함수에서 나와야 한다.** 원본은 오른쪽 체크리스트를
따로 계산했는데, 그러면 **체크는 초록인데 저장이 막히는** 화면이 만들어진다.

⚠️ **손대기 전에는 빨갛게 하지 않는다.** 빈 폼을 열자마자 "아이템명을 입력하세요" 가
붉게 뜨면 아직 아무것도 안 했는데 혼난 기분이 든다. 무엇이 남았는지는 체크리스트가
말하고, 필드 오류는 `formState.isDirty` 뒤에 붙는다.

**에셋은 올리는 것이 아니라 고르는 것이다**(`AssetPicker`). 우리 에셋은 빌드 때
들어오는 SVG 묶음이라 목록이 정해져 있다(§8) — 업로드 API 가 없어도 지금 고를 수 있고,
생기면 파일을 올리는 경로가 그 옆에 붙는다. 화면은 `mocks/` 를 못 보므로 목록은
파사드(`getAssets(slot)`)를 거친다.

- **슬롯으로 거른다.** 머리 아이템에 몸 에셋을 붙이면 캐릭터에 겹쳐 그려진다.
- **에셋을 필수로 만들었다**(`validateItem`). 없으면 목록에서 `?` 로 뜬다 — 실제로
  등록 기능을 먼저 붙였을 때 그렇게 나왔다.
- 상세의 「에셋 교체」도 같은 창을 열고 바로 저장한다.

> 원본 폼의 「에셋 파일」은 **파일명만 보여 주는 읽기 전용 한 줄**이었고, 이미지를
> 바꾸는 자리는 상세의 「에셋 교체」 버튼 하나뿐이었다(동작 정의 없음). 고르기를 붙인 건
> 원본에 없던 것이다.

**초안은 자동 저장한다**(`useItemDraft`, 500ms 디바운스). keep-alive 는 새로고침을
못 견디는데(§6.3), 잃는 일은 대개 실수로 새로고침할 때 일어나고 그때는 버튼을 누를
기회가 없다. 「임시 저장」 버튼은 *즉시* 쓰고 "방금 저장됐다"를 보여 주는 역할이다.

- 되살리는 것은 **폼을 만들기 전에** 한다 — `defaultValues` 는 나중에 바꿀 수 없다.
- ⚠️ 되살릴 때 **기본값은 원본으로 두고 값만 갈아 끼운다**(`reset(draft, { keepDefaultValues: true })`).
  초안을 기본값으로 넣으면 폼이 "깨끗하다"고 여겨 미저장 경고도 자동 저장도 안 돈다 —
  되살려 놓고 다음 새로고침에 또 잃는다.
- `sessionStorage` 는 남이 고칠 수 있고 우리가 타입을 바꾸면 옛 초안이 남는다.
  **모양이 안 맞으면 조용히 버린다**(§18.1 의 `?slot=WING` 과 같은 이유).
- 초안은 **저장에 성공한 뒤에** 지운다. 실패했는데 지우면 쓰던 게 사라진다.

⚠️ **저장 직후의 이동을 미저장 가드가 막는다.** 두 번 걸렸다.

| | |
|---|---|
| `form.reset()` 이 `isDirty` 를 지워도 **그 값이 스토어에 닿는 건 다음 effect** 다 | `useUnsavedGuard` 가 돌려주는 함수로 **지금 당장** 지운다 |
| 가드가 스토어를 **구독해 클로저로** 들고 있었다 | `useUnsavedNavGuard` 가 판정할 때 `getState()` 로 직접 읽는다 |

둘 중 하나만 고치면 여전히 막힌다. 방금 저장한 사람에게 "저장하지 않고 이동할까요?"
를 묻는 화면이 되므로, 폼을 새로 만들 때 이 둘을 먼저 확인할 것.

---

### 18.7.1 편집 경로는 하나다

상세에 있던 「에셋 교체」를 **지웠다.** 고르면 그 자리에서 즉시 저장하는 버튼이었는데,
바로 옆에 「수정」 이 생기면서 **같은 필드를 바꾸는 길이 둘**이 됐다 — 하나는 즉시 저장이라
미저장 경고를 받지 않아, 어느 쪽이 어떻게 동작하는지 예측할 수 없다.

수정 화면이 생기기 전에는 그 버튼이 유일한 편집 수단이라 의미가 있었다. 이제는 아니다.
**상세는 보는 화면**으로 두고, 그림을 바꾸는 길도 「수정」 하나로 모은다.

> 규칙: **한 필드를 바꾸는 길은 하나다.** 빠른 경로를 따로 두려면 그 경로도 폼과 같은
> 저장·경고 규칙을 따라야 하는데, 그러면 폼과 다를 이유가 없어진다.

### 18.8 동작하지 않는 버튼

「CSV 내보내기」는 **비활성 + 라벨에 「· 준비 중」** 이다. 내보낼 것은 지금 쪽이 아니라
필터에 걸린 전체여야 하는데, 서버가 쪽을 자르기 시작하면 전용 엔드포인트 없이 만들 수 없다.
**눌러도 반쪽만 나오는 버튼보다 잠긴 버튼이 낫다** — 지표 화면의 「기간 설정」과 같은 처리다.

⚠️ **잠긴 이유를 `title` 로만 두지 말 것.** `disabled` 버튼은 포커스를 받지 못해
**툴팁이 뜨지 않고**(마우스 hover 로만 보인다) 스크린리더도 읽어 주지 않는다. 그러면
"왜 못 누르는지" 를 아무 데서도 알 수 없는 버튼이 된다. 이유는 **라벨에** 적는다.

```text
✗ <Button disabled title="준비 중">CSV 내보내기</Button>
✓ <Button disabled>CSV 내보내기 · 준비 중</Button>
```

주소를 아직 모르는 외부 링크도 같다 — 예시 도메인을 넣어 두면 눌렀을 때 엉뚱한 데로 가고,
그건 "이 도구는 고장났다" 를 학습시킨다. 자리는 두되 잠그고 이유를 보이게 쓴다
(종 상세의 「아트 저장소 열기」).

---

## 19. 캐릭터 종 (種)

### 19.1 종은 색으로 정의된다

⚠️ **13종이 전부 같은 그림(`#rg`)을 쓴다.** 종을 가르는 것은 **대표 색 하나**이고,
그 색을 `color-mix(in srgb, <tone> 16%, var(--surf))` 로 옅게 깔아 **배경으로만** 드러낸다.

```text
루티 #7DBAFF · 하늬 #8ADFF0 · 별이 #B99BEA · 미르 #F0B928 …
```

타일을 그릴 때 `speciesTint` 를 빠뜨리면 **열세 칸이 전부 똑같아 보인다.**

⚠️ **대표 색을 글자색으로 쓰지 말 것.** 운영자가 넣는 값이라 명암비를 우리가 보증할 수
없고, `scripts/check-contrast.ts` 는 **토큰만** 보므로 이 값은 검사되지 않는다. 16% 로
옅게 깔아야 어떤 색이 와도 그 위의 `ink` 가 읽힌다.

이 구조 덕분에 **종에는 올릴 이미지가 없다.** 종 등록은 색 고르기 + 설정이지 업로드가
아니라서, `riruti-assets.js` 가 잘려 있는 것과 무관하게 만들 수 있다(§8.5).

### 19.2 어드민이 만지는 것과 아닌 것

원본이 두 곳에서 못박는다.

> 종 특성도 슬롯 기본값일 뿐입니다. … **종의 아트 자체는 캐릭터팀이 관리하며 이
> 어드민에서는 읽기 전용입니다.**

| | 어드민 | 캐릭터팀 |
|---|---|---|
| 슬롯 기본값 · 출현 가중치 · 해금 조건 · 시즌 | ✅ | |
| 리그 기준 좌표 · 슬롯 구조 | 읽기만 | ✅ |
| 종의 아트 | | ✅ (「아트 저장소 열기」 외부 링크) |

**종 등록은 원본에 없다. 그래도 만든다** — 다만 §19.1 때문에 부담이 작고,
⚠️ **새 종은 「미출현」 으로 생성한다.** 클라이언트에 그 종의 아트가 아직 없으므로
등록하자마자 뽑기에 나오면 안 된다.

### 19.3 고정 집합에는 등록을 만들지 않는다

| | 개수 | |
|---|---|---|
| 리그 슬롯 | 6 | 아트 파이프라인이 정한다 |
| 성장 단계 | 4 | 알 · 금 · 유체 · 성체 |
| 둥지 | 3 | 누적 일수로 해금 |

개수가 기획으로 고정된 집합에 등록 버튼을 붙이면 **운영자가 눌렀을 때 게임이 감당 못 하는
데이터가 생긴다** — 둥지를 4번째로 만들면 해금 일수 구간이 겹치고, 성장 단계를 늘리면
클라이언트에 그 연출이 없다.

### 19.4 출현 가중치는 혼자서 읽히지 않는다

가중치는 절대값이라 `420` 이 흔한 건지 드문 건지 알 수 없다. **같은 희귀도끼리 견줘야**
뽑기 확률이 된다 — `appearanceShare` 가 그 계산이다.

⚠️ **미출현은 분모에서도 빠진다.** 빠뜨리면 뽑기 풀에 없는 종이 확률을 갉아먹는 것처럼
보이고, 남은 종의 표시 확률이 실제보다 낮게 나온다.

### 19.4.1 슬롯 표가 둘이고, 「덮어쓰기」 는 아이템 얘기다

원본이 슬롯 표를 둘 그린다. **한쪽이 틀린 게 아니라 묻는 것이 다르다.**

| | 묻는 것 | 「몸」 |
|---|---|---|
| 리그 · 슬롯 | *리그가 그 슬롯을 두는가* | 둔다 |
| 종 상세 | *아이템이 그 슬롯을 덮어쓸 수 있는가* | **불가** — 의상이 몸 위에 얹힌다 |

⚠️ **「덮어쓰기 불가」 를 「운영자가 못 고침」 으로 읽지 말 것.** 아이템이 갈아끼우지
못한다는 뜻일 뿐, **종의 기본 몸은 종마다 다르다** — `SLOT_PARTS.몸` 에 선택지가 둘이고
**모루가 「통통한 몸」 을 쓴다.** 그래서 여섯 슬롯 모두 편집할 수 있다.

둘을 헷갈려 몸을 읽기 전용으로 만들면 **모루의 값을 고칠 수 없게 된다.**

> 리그 화면의 부제 「모든 캐릭터가 같은 몸과 같은 외곽선을 씁니다」 는 **리그(뼈대)가
> 같다**는 말이지 부품이 같다는 말이 아니다 — 바로 다음 문장이 "여섯 슬롯에 어떤 부품을
> 꽂느냐로 개성이 결정됩니다" 라고 잇는다. 원본 문구를 그대로 옮겼다.

### 19.4.2 종 등록 (원본에 없다)

⚠️ **새 종은 「미출현」 으로 만들어진다.** 클라이언트에 그 종의 아트가 아직 없으므로
등록하자마자 뽑기에 나오면 안 된다. 화면에서도 그 사실을 말하고, 아트가 붙은 뒤
상세의 「출현 재개」로 켠다.

⚠️ **대표 색은 `<input type="color">` 로 받지 않는다.** OS 창이라 다크 테마도 키보드
흐름도 우리가 못 잡고, **고른 값이 정확히 무엇인지 운영자가 못 본다.** hex 를 직접 받고
옆에 스와치를 둔다 — 값이 곧 화면이다.

### 19.4.3 검사를 못 하는 상태 ≠ 통과한 상태

⚠️ **종 등록은 목록이 오기 전·실패했을 때 막힌다.** 중복 코드 검사는 `taken`(이미 쓰는
코드들)을 받아야 하는데, 목록이 없으면 그게 빈 배열이라 **어떤 코드든 통과한다.**
파사드는 중복을 보지 않으므로 그대로 저장되고, 같은 코드의 종이 둘 생긴다.

```text
목록 아직 안 옴 → taken = [] → 'SP-BLUE' 통과 → 저장 → 중복
```

`list.isPending || list.isError` 면 등록을 잠그고, 실패했으면 **왜 잠겼는지** 배너로 말한다.
잠긴 이유를 안 알려 주면 운영자는 폼이 고장난 줄 안다.

### 19.5 검증한 값과 저장하는 값은 같아야 한다

⚠️ **`validateSpecies` 는 다듬은 값(`normalizeSpeciesInput`)을 검증하고, 파사드는 저장 직전에
같은 함수를 거친다.** 검증만 `trim()` 하고 저장은 원본을 넣으면 이렇게 샌다.

```text
' SP-NEW ' 입력 → 검증 통과(다듬으면 SP-NEW) → 저장은 ' SP-NEW ' 그대로
   ↓
나중에 'SP-NEW' 등록 → taken 에는 ' SP-NEW ' 뿐이라 중복 검사를 빠져나감
   ↓
같은 코드의 종이 둘. 어느 쪽을 가리키는지 서버도 사람도 모른다
```

이미 저장된 쪽에도 공백이 섞여 있을 수 있으므로 **양쪽을 같은 자로 잰다**(`taken.some(t => t.trim() === code)`).

⚠️ **다듬기는 하되 대문자로 올리지는 않는다.** `SP-blue` 를 조용히 고치면 형식 규칙이
무의미해지고, 운영자는 자기가 친 것과 다른 값이 저장된 것을 모른다. 공백은 실수가
분명하지만 대소문자는 의도일 수 있다 — **자동으로 고칠 것과 막을 것의 경계가 거기다.**

### 19.6 종류 목록은 쪽을 자르지 않는다

13개뿐이라 페이지 바가 화면만 차지한다(원본에도 없다). 대신 **희귀도 탭**과
**격자/목록 전환**이 있고 둘 다 주소에 실린다(§18.1) — 모르는 값은 조용히 버린다.

---

## 20. 챌린지

### 20.1 기간과 반복은 다른 축이다

⚠️ **「매일 05:00 초기화」 는 기간이 아니라 반복 규칙이다.** 원본이 둘을 `period` 한 칸에
섞어 두었는데, 폼에서 시작·종료를 받으려면 갈라야 한다.

| | 무엇 | 어디서 오나 |
|---|---|---|
| 기간 | 이 챌린지가 언제부터 언제까지 살아 있는가 | `startAt`/`endAt` — 운영자가 정한다 |
| 반복 | 언제 다시 셀 수 있게 되는가 | `kind` 가 정한다 (`REPEAT_LABEL`) |

일상 챌린지는 기간이 「제한 없음」 이어도 매일 05:00 에 초기화된다. 섞어 두면
**기간을 고쳐도 화면의 「기간」 이 안 바뀌는** 화면이 된다.

### 20.2 상태는 기간에서 나온다

`challengeStatusOf(input, today, prev)` 가 정한다 — 등록과 수정이 같은 규칙을 쓴다(§19.5).

⚠️ **`today` 를 인자로 받는다.** 안에서 `new Date()` 를 부르면 테스트가 실행한 날에 따라
달라진다. 오늘이 언제인지는 파사드가 안다.

⚠️ **「중단」 한 것은 되살아나지 않는다.** 기간이 남아 있어도 `ENDED` 를 유지한다 —
사람이 내린 결정이라 날짜가 뒤집으면 안 된다. 종 상세의 「미출현」 과 같은 성질이다.

### 20.2.1 자동 만료와 수동 중단은 다르다

⚠️ **둘을 `status: 'ENDED'` 하나로 묶으면 안 된다.** 종료일이 지나 저절로 끝난 챌린지의
종료일을 미래로 고치는 것은 곧 **"다시 열겠다"** 는 뜻인데, 「중단」 과 같게 다루면
운영자가 분명히 고쳤는데 화면이 아무 반응을 안 한다.

`stopped: boolean` 을 따로 둔다.

```text
stopped=true   → 날짜와 무관하게 ENDED   (사람이 내린 결정)
stopped=false  → 날짜가 정한다            (endAt 을 미루면 되살아난다)
```

### 20.2.2 운영 기준일은 시간대를 명시한다

⚠️ **`new Date().toISOString().slice(0,10)` 은 UTC 날짜다.** 한국 자정~오전 9시 사이에는
**전날**로 찍혀서, 오늘 시작하는 챌린지가 「예약」 으로 잡힌다.

```ts
const OPERATING_TZ = 'Asia/Seoul'
new Intl.DateTimeFormat('sv-SE', { timeZone: OPERATING_TZ }).format(new Date())
```

`sv-SE` 로케일이 `YYYY-MM-DD` 를 그대로 준다. `date()` 가 한 번 깨졌던 것과 같은 종류다.

### 20.3 보상이 아예 없는 챌린지는 만들 수 없다

젬이 0 이면 **보상 아이템이 있어야 한다.** 둘 다 없으면 달성해도 받는 게 없는 챌린지가
운영에 나간다. 목표치 0 도 같은 이유로 막는다 — 조건을 걸어 놓고 아무것도 세지 않는다.

### 20.4 조건은 고르는 것만 받는다

`CHALLENGE_CONDS` 밖의 값은 **서버가 셀 수 없다.** 자유 입력으로 두면 달성이 영영 안
잡히는 챌린지가 만들어진다.

### 20.5 보상 아이템은 에셋이 아니다

`AssetPicker` 를 쓰지 않는다 — 그 창은 슬롯별 **그림** 목록이고, 챌린지 보상은
**이미 만들어진 아이템**을 가리켜야 한다(그림만 같고 가격·획득 경로가 다른 아이템이
여럿일 수 있다). `RewardItemPicker` 가 이름으로 찾는다.

⚠️ **보상 표시에 `shared/lib` 의 `gem()` 을 쓰지 말 것.** 그건 아이템 **가격** 포맷터라
0 을 「무료」 로 옮기는데, 보상이 0 젬인 것은 "공짜" 가 아니라 **젬을 안 준다**는 뜻이다.
그대로 쓰면 「무료 · 금세공 왕관」 이 나온다. `rewardLabel` 이 있는 것만 이어 붙인다.

### 20.5.1 `assetSrc` 는 경계마다 다시 새어 나간다

⚠️ **아이템에서 다른 모양으로 옮겨 담을 때 `assetSrc` 를 빠뜨리기 쉽다.** 올린 에셋은
빌드에 없어 `assetId` 로 못 찾으므로(§8.5), 버리는 순간 그림이 `?` 가 된다.

`RewardItemPicker` 가 딱 그랬다 — **창 안에서는 잘 보이다가 고른 뒤에 사라졌다.**
창은 `Item` 을 그대로 그렸고(`src={item.assetSrc}`), 고를 때는 `{assetId, name, slot}` 만
담았기 때문이다. 눈으로 보면 "골랐더니 그림이 없어진" 것으로 보인다.

> 규칙: **`assetId` 를 옮겨 담는 자리에는 `assetSrc` 도 함께 옮긴다.** 보상 아이템 모양은
> 도메인(`ChallengeReward`)이 갖고 있어 화면끼리 어긋나지 않는다.

### 20.6 등록 화면은 빈 id 로 조회하지 않는다

⚠️ **훅은 조기 반환보다 먼저 돈다.** `useChallenge(chalId ?? '')` 를 그대로 두면
`if (!chalId) return <Form/>` 가 화면을 가려도 **요청은 이미 떠난 뒤**라, 등록 화면을
열 때마다 404 조회가 나간다. `enabled: chalId !== ''` 로 막는다.

`useItem` 도 같은 모양이었다 — 한쪽만 고치면 다음에 또 나온다.

---

## 21. 회원

### 21.1 재화는 둘이고 합치면 안 된다

⚠️ **파란보석(유상)과 노란보석(무상)을 합쳐 보이지 말 것.** 환불 대상은 **유상뿐**이라,
합계만 보고 환불액을 잡으면 무상까지 돌려주게 된다.

목록의 「보유 재화」 열도 `1,840 · 320` 처럼 나눠 쓴다 — 색이 다르지만 **구분자가 먼저**다.

### 21.2 탈퇴는 기본으로 숨긴다

탈퇴 계정은 개인정보가 지워지는 중이거나 이미 지워졌다. 운영자가 평소에 보고 싶은
대상이 아니라 **기본 제외**이고, 보려면 「탈퇴 회원 포함」 을 켠다.

⚠️ **상태 필터로 「탈퇴」 를 직접 고르면 그 스위치와 무관하게 보여 준다.** 탈퇴만 보려고
고른 사람에게 "포함도 켜라" 고 하면 **화면이 빈 채로 남는다.**

그래서 상태 탭에는 「탈퇴」 가 **없다** — 탭과 스위치를 둘 다 두면 서로 싸운다.

### 21.3 탈퇴 계정은 제재할 수 없다

⚠️ 이미 떠난 계정에 제재를 걸면 상태가 되살아난 것처럼 보이고, **푸는 순간 「정상」 이
되어 탈퇴가 취소된 것처럼** 읽힌다. `canBan` 이 막고, 버튼은 잠긴 채로
「제재 · 탈퇴 계정」 이라고 **이유를 라벨에** 쓴다(§18.8).

⚠️ **제재를 풀면 「정상」 이다.** 휴면이었는지는 모른다 — 휴면은 접속 기록이 정하는
파생 상태이고 우리는 그 기록을 갖고 있지 않다. 다음 접속에 서버가 다시 정한다.

### 21.4 지표는 거르기 전 전체로 내고, **상수로 두지 않는다**

⚠️ 필터를 걸 때마다 「전체 회원」 이 바뀌면 그건 **필터 결과지 전체가 아니다.**
파사드가 `summarize(all, today())` 로 따로 낸다.

⚠️ **「오늘 가입」 을 상수로 박지 말 것.** 원본은 `'34'` 를 넣어 뒀는데, 그러면 같은 화면의
「전체 회원 10」 과 **서로 모순되는 숫자**가 나란히 뜬다.

> 다른 목 수치와 다른 점이 이것이다. 즐겨찾기(판매×0.34)나 반환(0건)은 원본이 지어낸
> 값이어도 **화면 안에서 어긋나지 않는다** — 그래서 그대로 옮긴다(§18.6). 반면 이 숫자는
> 옆 칸과 직접 부딪힌다. **「원본 그대로」 는 화면이 스스로 모순되지 않는 선까지다.**

### 21.5 이력의 합은 요약과 맞아야 한다

⚠️ **완료된 주문의 합이 「누적 결제」 와 정확히 같아야 한다.** 상세가 둘을 나란히 보여
주므로 어긋나면 바로 보인다. 두 군데를 조심한다.

| | |
|---|---|
| 나눗셈 나머지 | `Math.round(paid / n)` 이면 62,000/3 의 합이 62,001 이 된다. **내림으로 나누고 마지막 한 건이 나머지를 가져간다** |
| 환불 | **환불된 건은 누적 결제에 안 들어간다.** `paid` 는 완료 건들에만 나누고 환불 건은 그 밖에 붙인다 |

목 12명 전부를 훑어 완료 합계가 `paid` 와 같은지 확인했다 — 이런 건 눈으로 못 본다.

---

## 22. 결제

### 22.1 「준비」 는 사고 후보다

⚠️ **결제사에서 돈은 나갔는데 우리 원장에 재화가 안 들어간 상태다.** 「완료」 옆에
회색으로 두면 그냥 진행 중으로 읽혀서, 목록에 섞이면 **아무도 못 본다.**

그래서 둘을 한다.

- 배지 색을 **경고(`warn`)** 로 — 「진행 중」 이 아니라 「봐야 할 것」 이다
- 목록 **위에 따로 모은다**(`stuckPayments`). 필터에 가려지지 않게 **거르기 전 전체**에서 뽑는다

상세에도 무엇을 해야 하는지 적는다 — 돈이 나갔으면 재화를 지급하고, 안 나갔으면 실패로
정리한다. 「준비」 라는 낱말만으로는 다음 행동을 모른다.

### 22.2 환불액은 결제 금액이 아니다

⚠️ **미사용 유상 재화만 청약철회 대상이다.**

| | 환불 대상 | 왜 |
|---|---|---|
| 안 쓴 유상 재화 | ✅ | 아직 상품을 안 받았다 |
| 쓴 유상 재화 | ❌ | 이미 상품을 받았다 |
| 보너스(무상) | ❌ | **애초에 판 것이 아니다** |

결제 금액을 그대로 돌려주면 **쓴 만큼을 공짜로 준 셈**이 된다.

```text
1,100원에 100개를 팔았고 60개가 남았다  →  1,100 × 60 / 100 = 660원
```

⚠️ **지급량이 상한이다.** 다른 결제로 받은 재화가 남아 있어도 **이 결제로 판 것보다 많이**
돌려줄 수는 없다(`Math.min(unusedGem, give)`). 나머지는 **버린다** — 올림하면 판 것보다
많이 나간다.

**계산을 화면에 드러낸다.** 「1,100원 중 660원」 만 보이면 왜 그런지 알 수 없어서,
운영자가 결제 금액을 그대로 돌려주려 한다.

### 22.2.2 `unusedGem` 은 **결제별 잔여**다 — 회원 잔액이 아니다

⚠️ **회원 지갑 값을 결제마다 복사하면 안 된다.** 한 사람이 결제를 두 번 했을 때 두 건이
모두 "미사용 1,200개" 를 들게 되어, **둘 다 환불하면 산 것보다 많이 나간다.**

```text
소이  실제 미사용 1,200개 (결제 2건 × 1,000개)

✗ 두 건 모두 unusedGem 1,200  →  각각 전액  →  24,200원 (2,000개어치)
✓ 오늘 1,000 · 어제 200       →  12,100 + 2,420 = 14,520원 (1,200개어치)
```

실제로 그렇게 넣었다가 소이가 24,200원, 새벽러너가 63,800원(5,800개어치 · 실제 2,900)으로
나왔다. **한 건만 보면 계산이 맞아서 화면으로는 안 보인다** — 같은 회원의 결제를 모아 봐야
드러난다.

**오래 산 것부터 쓴다**고 본다(FIFO) — 잔여는 **최신 결제에 남고**, 각 결제의 잔여는 그
결제로 산 수량을 넘지 않는다. 서버에서는 원장이 결제 단위 lot 을 추적해야 하고,
환불은 그 lot 을 회수하는 트랜잭션이다.

> 목이 이 불변식을 지키는지 **회원별로 훑어 확인했다** — 잔여합이 한도와 같고, 어느 결제도
> 자기 지급량보다 많이 들고 있지 않다. 규칙 하나로는 표현할 수 없어(결제 사이의 관계다)
> 테스트가 아니라 목 생성기가 보장한다.

### 22.2.1 목 날짜는 오늘을 기준으로 만든다

⚠️ **날짜를 박아 두면 「오늘 결제」 가 영원히 0 원이 된다.** 원본은 `2026-08-14` 처럼
고정된 값인데, 오늘이 그날이 아니면 **화면은 멀쩡한데 죽은 숫자**가 하나 생긴다.

`shared/lib/today.ts` 의 `daysAgo(n)` 로 만든다. 원본의 **날짜 간격**은 그대로 옮긴다
(14일 3건 · 13일 4건 · 12일 3건 · 11일 2건 → 오늘 3건 · 어제 4건 · 그제 3건 · 그끄제 2건).

⚠️ **주문번호에 박힌 날짜도 함께 옮겨야 한다.** `ord_20260814_9921` 이 오늘 결제에
붙어 있으면 **한눈에 가짜로 보인다.** 일련번호만 데이터에 두고 날짜는 만들 때 붙인다.

> **회원의 `joinedAt` 은 그대로 둔다.** 결제는 *사건*이라 최근성이 뜻을 갖지만, 가입일은
> *속성*이고 계정 나이를 말한다. 12명 중 오늘 가입자가 없는 것은 **사실**이라
> 「오늘 가입 0」 이 맞다(§21.4).

`today()` 는 `shared/lib` 에 있다 — `mocks/` 도 써야 하는데 `mocks` 는 `api` 를 볼 수
없다(§4.3). 파사드가 계속 `./core` 에서 가져올 수 있게 `api/core/today.ts` 가 다시 내보낸다.

### 22.2.3 잠근 버튼은 검증이 아니다

⚠️ **화면의 `disabled` 는 그 화면의 그 버튼만 막는다.** 북마크한 주소·재시도·나중에 붙을
다른 호출 경로는 그대로 들어온다. 준비·실패 건을 환불하면 **받지도 않은 돈을 돌려주고**,
이미 환불한 건은 **두 번 나간다.**

같은 판정(`canRefund`)을 **변이 경계**에 둔다.

| 자리 | 무엇을 위해 |
|---|---|
| 화면 버튼 | 누를 수 없게 — 그리고 **왜 못 누르는지 라벨에**(§18.8) |
| 파사드 | 화면이 읽을 **한국어 메시지** (「준비 건은 환불할 수 없습니다」) |
| 목/서버 | 마지막 방어 — 여기서 막지 못하면 데이터가 깨진다 |

⚠️ **파사드 안에서도 사유 검사가 상태 검사보다 먼저다.** 사유를 비우면 상태에 닿기 전에
400 으로 끊기므로, **상태 검증을 확인할 때는 사유를 채워야 한다** — 안 그러면 막힌 것을 보고
상태 때문이라 착각한다.

> 파사드를 직접 불러 확인했다 — 화면이 잠겨 있어도 준비 건은 막힌다.
>
> ```text
> refund({ payId: '2', reason: '' })          → 400 환불 사유를 입력하세요.
> refund({ payId: '2', reason: '상태 검증' })  → 409 준비 건은 환불할 수 없습니다.
> ```

### 22.3 매출에는 「완료」 만 센다

실패·준비는 돈이 우리에게 오지 않았고, 환불은 돌려줬다. 전부 세면 매출이 부풀려진다.

⚠️ 지표는 **거르기 전 전체**로 낸다 — 필터마다 「확인 필요」 가 바뀌면 사고 건수가 아니라
필터 결과가 된다(§21.4 와 같은 규칙).

### 22.4 환불 사유는 필수다

되돌릴 수 없고 감사 로그에 남는 행위라, 나중에 **"왜 돌려줬나"** 를 답할 수 있어야 한다.
확인 창에서 사유 없이 누르면 닫히지 않는다.

⚠️ **결제사 취소와 재화 회수는 함께 일어나야 한다.** 둘 중 하나만 성공하면 돈은 돌려줬는데
재화가 남거나 그 반대가 된다 — 서버가 한 트랜잭션으로 처리해야 한다.

---

## 23. 모더레이션

신고 처리(`/moderation/reports`)와 AI 심사(`/moderation/ai`). 둘 다 **회원이 올린 인증 사진**을 다루므로 열람 자체가 개인정보 처리다.

### 23.1 신고 건수는 신고자 수다

원본은 건수를 별도 숫자로 들고(`r[3]`) 신고자 사유는 배열로(`r[5]`) 따로 뒀다. 두 값이 안 맞아 **「신고 5건」 옆에 신고자가 3명**만 나온다.

운영자가 물을 수 있는 질문이 아니다 — "나머지 2명은 어디 갔나"에 화면이 답할 수 없다. `reportCount(r)` 을 `r.reporters.length` 로 두고 목 데이터의 사유 배열을 건수만큼 늘렸다.

같은 판단을 「오늘 접수」 에도 적용했다. 원본은 `'14'` 상수인데 목록에는 8건뿐이라, 날짜에서 센다(§21.4 와 같은 이유).

### 23.2 목록과 상세를 한 화면에 둔다

**아이템·결제와 다르게 상세를 별도 라우트로 빼지 않았다.** 여기는 훑는 화면이다 — 밀린 신고를 위에서 아래로 처리하는 동안 왼쪽 큐가 계속 보여야 몇 개 남았는지 안다. 상세로 나갔다 돌아오는 왕복이 건마다 생기면 그게 일의 대부분이 된다.

대신 **선택한 건을 `?id=` 에 싣는다.** "이 신고 좀 봐줘" 를 링크로 넘길 수 있어야 한다. URL 의 id 가 지금 탭에 없으면(처리해서 빠졌거나 남이 보낸 링크) 첫 행으로 떨어진다.

**처리하면 다음 건으로 옮겨 간다** (`nextAfterRemoved`). 「대기」 탭에서 처리한 행은 목록에서 사라지는데, 그때 아무것도 안 고르면 오른쪽이 빈 화면이 되어 **매번 다음 건을 손으로 눌러야 한다.** 뒤 행을 먼저 고르고 마지막이었으면 앞 행으로 간다.

> 「처리 완료」·「전체」 탭에서는 행이 그대로 남으므로 옮기지 않는다. 안 그러면 방금 처리한 결과를 확인할 새도 없이 화면이 바뀐다.

**이미 그 상태인 버튼은 잠근다.** 「숨김 유지」 인 건에 다시 「숨김 유지」 를 누르면 아무 일도 안 일어나는데 버튼은 반응한 것처럼 보인다. 반대 결정은 막지 않는다 — 「오신고는 여기서 되돌립니다」 가 이 화면의 목적이다.

### 23.2.1 ⚠️ `setSearchParams` 의 **갱신 함수는 최신 값을 주지 않는다**

변이의 `onSuccess` 에서 주소를 고칠 때, 렌더 시점의 `searchParams` 를 닫아 두면 그사이 탭을 옮겼을 때 **옮기기 전 주소를 다시 써서 탭이 되돌아간다.** 목의 250ms 안에서 재현했다.

```text
「숨김 유지」 누름 → 60ms 뒤 「전체」 탭으로 이동 → ?tab=전체
                  → 250ms 뒤 변이 성공, 낡은 params 를 다시 씀
결과              → ?id=1  ·  탭이 「대기」 로 되돌아감
```

**여기까지는 흔한 실수인데, 통하는 고침이 반직관적이다.** `useState` 라면 갱신 함수(`set(prev => …)`)가 답이지만 **여기서는 안 통한다.** react-router 8 의 구현이 이렇다.

```js
return [searchParams, useCallback((nextInit, opts) => {
  const next = createSearchParams(
    typeof nextInit === 'function' ? nextInit(new URLSearchParams(searchParams)) : nextInit
  )
  navigate('?' + next, opts)
}, [navigate, searchParams])]
```

`prev` 로 넘어오는 것은 **그 `setSearchParams` 를 만든 렌더의 `searchParams`** 다. setter 자체가 `searchParams` 에 memo 돼 있어서, 비동기 콜백이 쥐고 있는 옛 setter 는 옛 값을 그대로 준다 — `prev` 는 닫아 둔 `params` 와 **정확히 같은 만큼 낡았다.** 고친 줄 알고 넘어가기 딱 좋은 자리다.

그래서 주소를 **브라우저에서 직접 읽는다** (`liveParams()`). `navigate` 는 `history.replaceState` 를 동기로 부르므로 `window.location.search` 가 항상 최신이다. 다음 건으로 옮길지도 그 값으로 판단한다.

> `useState` 의 setter 에는 이 함정이 없다 — React 가 최신 상태를 넘겨준다. **라이브러리 setter 는 그 보장을 안 할 수 있다**는 것이 여기서 배운 것이다. 화면이 빠르면 안 드러나고 느린 네트워크에서만 드러난다.

### 23.3 원본의 차트는 자기 통과율을 설명하지 못했다

원본은 막대에 **승인 + 대기**를 쌓고 그 위에 **통과율** 선을 그렸다. 통과율의 분모인 **반려가 화면 어디에도 없다.**

바로 아래 경고 문구가 이유를 말해 준다 — 반려는 기록이 남지 않는다. 그래서 이렇게 정리했다.

| | 아는가 | 어디에 |
|---|---|---|
| 반려 **건수** | 안다 (심사 API 가 성공·실패 수를 센다) | 차트의 쌓는 막대 · 통과율 |
| 반려 **내역** (누가·무엇을·왜) | **모른다** | 목록에 나타나지 않는다 |

막대를 **승인 + 반려**로 바꿔 선과 막대가 같은 것을 말하게 했다. 「대기」 는 하루치 집계에 들어갈 값이 아니다 — 지난 날짜의 대기는 시간이 지나면 저절로 사라지므로 과거 막대에 그리면 매일 모양이 바뀐다.

⚠️ **통과율의 분모에 대기를 넣지 말 것.** 심사가 나아진 게 아니라 큐가 비워진 것뿐인데 통과율이 저절로 오른다.

**「심사 대기」 지표는 목록에서 센다.** 원본은 지표에 11 을 적고 목록에는 대기 2건만 뒀다. 지금은 「대기」 탭의 행 수와 지표가 같은 값에서 나오므로 어긋날 수 없다.

> **막대를 쌓는 것과 나란히 놓는 것은 다른 말이다.** 나란히 놓으면 둘을 비교하라는 뜻이고, 쌓으면 둘의 합이 전체라는 뜻이다. 그래서 `BarChart`(그룹)가 아니라 `StackedBarLineChart` 를 따로 만들었다. 비율선은 **축이 따로다** — 건수(천 단위)와 %를 한 축에 두면 선이 바닥에 눕는다. 오른쪽 축은 60–100% 만 보여 준다.

### 23.4 끄는 것만 확인을 받는다

AI 심사 스위치는 **끄면 모든 인증이 심사 없이 즉시 승인된다.** 되돌려도 그사이 통과한 것은 다시 심사하지 않으므로, 실질적으로 되돌릴 수 없다.

- **끄기 → 확인 창.** 켜기는 안전하므로 바로 보낸다. 위험한 방향에만 마찰을 준다.
- **취소하면 스위치는 켜진 채 남는다.** 낙관적으로 먼저 끄면 취소했는데 꺼져 보인다.

같은 이유로 2단계 인증 해제도 현재 코드를 요구한다(§13). 되돌릴 수 없는 설정은 확인 창 하나로 넘기지 않는다.

### 23.5 사진은 자리만 그린다

인증 사진 원본은 목에 없고, 있어도 **이 화면 밖으로 나가면 안 되는 개인 콘텐츠**다. 빈 칸을 두지 않고 무엇이 들어올 자리인지와 취급 규칙을 적었다.

⚠️ **「열람 기록은 감사 로그에 남습니다」 라고 쓰지 않는다.** 감사 로그 API 가 아직 없다. 남는다고 적으면 운영자는 **추적되고 있다고 믿는다** — 헤더의 정적 「● 라이브」 배지를 지운 것과 같은 문제다 — 점검 중에도 초록 점이 켜져 있으면 운영자가 그걸 믿는다. **없는 보증을 표시하는 것은 아무 말도 안 하는 것보다 나쁘다.**

규칙과 상태를 갈라 적는다.

| | 문구 |
|---|---|
| **규칙** (지금도 유효) | 이 화면에서만 열람하고 내려받지 마세요 |
| **상태** (사실대로) | 열람 기록은 **아직 남지 않습니다** — 감사 로그 연동 전이라 지금은 규칙으로만 지켜집니다 |

요구 자체는 잊히면 안 되므로 `api/moderation.ts` 에 `TODO(감사 로그 API 가 생기면)` 로 걸어 뒀다. 연동되면 이 문장이 「남습니다」 로 바뀐다.

### 23.6 `StatTile` 승격

목록 위에 숫자 하나를 놓는 카드가 **회원 · 챌린지 · 결제 세 화면에 글자 단위로 같은 코드**로 복붙돼 있었다. 모더레이션이 네 번째라 올렸다 — 규약은 두 번째 소비자에서 승격이다(§4.4).

⚠️ **`StatCard` 와 다르다.** 저쪽은 지표 화면의 KPI 라 **변화량이 필수**다. 비교할 지난 값이 없는 수(밀린 건수·오늘 접수)를 저기 넣으면 `+0.0%` 같은 화살표를 지어내게 된다.

---

## 24. 성장 · 레벨 · 재화 · 상점

밸런스 상수와 돈이 걸린 설정. 셋 다 **바꾸면 이미 게임 안에 있는 회원에게 적용된다.**

### 24.1 「누적」 은 「필요 경험치」 를 더한 값이다

원본은 두 열을 **다른 식**으로 만들었다.

```js
need  = 100 + i*120 + i*i*18
total = need * (i + 1) * 0.62     // ← 러닝 합이 아니다
```

그래서 Lv 1 이 **「필요 100 · 누적 62」** 로 나온다. 누적이 필요치보다 작을 수는 없다. 운영자가 어느 쪽을 믿어야 하는지 알 수 없고, 밸런스를 이 표로 판단하면 틀린 결론을 낸다.

`withTotals` 가 `need` 를 앞에서부터 더해 채운다. 정의를 타입에 적었다 — `need` 는 **이 레벨에서 다음 레벨로**, `total` 은 **Lv 1 부터 이 레벨을 마치기까지**. 둘을 헷갈리면 표가 한 칸씩 밀린다.

> 「만렙까지 경험치」 지표도 따로 더하지 않고 **마지막 행의 `total`** 을 쓴다. 같은 값을 두 번 계산할 자리를 만들지 않는다.

### 24.1.1 「변경 저장」 을 두지 않았다

원본에는 「CSV 가져오기」 와 「변경 저장」 두 버튼이 있는데, 표에 입력 칸이 하나도 없다. **바꿀 수단이 없으면 저장할 것도 없다** — 원본의 가짜 검색창을 지운 것과 같은 판단이다 — **눌러도 아무 일이 없는 것보다 없는 것이 낫다**(§18.8 의 반대편 경우다).

「CSV 가져오기」 는 남겼다(잠금). 밸런스 상수는 기획이 스프레드시트로 관리하고 **통째로 갈아 끼우는** 것이 실제 편집 방식이라, 이 버튼이 살아나면 「변경 저장」 도 그때 같이 의미가 생긴다. 행 단위 저장 API 를 먼저 만들면 쓰이지 않는다.

### 24.2 비중은 **지금 파는 것**만으로 낸다

원본은 판매 비중을 상수(12·26·34·21·7)로 들었다. 합이 100 이지만 **「예약」 인 시즌 팩의 7%가 섞여 있다** — 지금 파는 넷만 더하면 93% 다. 표를 세로로 더한 운영자가 숫자를 의심하게 된다.

`orderShares` 가 **판매중 상품의 건수 합**을 분모로 쓴다. 예약·중단은 0% 이고 분모에도 안 들어간다. 「주간 매출」·「주간 결제」 지표도 같다.

⚠️ **행마다 따로 반올림하면 합이 100 이 아니다.** 각자 `Math.round` 하면 건수가 고를 때 오차가 같은 방향으로 쌓인다.

```text
건수 [1, 1, 1]           → 33 · 33 · 33            합 99
건수 [1, 1, 1, 1, 1, 1]  → 17 × 6                  합 102
건수 [2, 2, 2, 1]        → 29 · 29 · 29 · 14       합 101
```

지금 목 데이터(1243·1045·779·290)는 우연히 100 이 나와서 **화면만 보고는 안 드러난다.** 그래서 **최대 나머지 방식**으로 배분한다 — 전부 내림한 뒤 남은 %P 를 소수부가 큰 것부터 1 씩 준다.

`orderShares` 가 상품 하나가 아니라 **목록 전체**를 받는 이유가 이것이다. 한 행만 보고는 배분할 수 없다. 동률일 때는 건수가 많은 쪽 → `key` 순으로 깨는데, **새로고침할 때마다 다른 상품이 1%P 를 받으면 숫자가 흔들리는 것처럼 보이기** 때문이다.

**「젬당」 열을 더했다.** 원본에 없지만, 이 표를 보는 이유가 "큰 팩이 실제로 유리한가" 라서다 — 보너스를 포함해 나누면 11.0원 → 8.5원으로 떨어지는 것이 한눈에 보인다. ⚠️ **보너스를 빼고 나누면 큰 팩이 실제보다 비싸 보인다.**

### 24.2.1 `ProgressBar` 의 색은 「높을수록 좋다」 는 뜻이다

기본 색 규칙(60% 이상 초록 · 35% 이상 파랑 · 그 아래 주황)은 **보유율·달성률**용이다. 낮으면 손봐야 하는 값에 맞춰져 있다.

⚠️ **합이 100 인 분포에 쓰면 안 된다.** 판매 비중에 그대로 쓰면 가장 많이 팔린 상품이 초록, 대형 팩이 주황으로 칠해진다 — **큰 팩은 원래 건수가 적은 것이지 나쁜 것이 아니다.** `tone="plain"` 을 주면 한 색으로 그린다.

### 24.3 진열은 **누를 때마다 저장하지 않는다**

위아래로 몇 번 옮기는 동안 매번 서버에 쓰면 **중간 순서가 그대로 상점에 나간다.** 초안을 컴포넌트가 들고 있다가 「진열 저장」 에서 한 번 보낸다.

- 초안이 있으면 `useUnsavedGuard` 로 **탭에 미저장 점**이 뜬다. 탭을 닫으려 하면 확인 창이 막는다.
- **순서 전체를 보낸다.** "3번을 2번으로" 같은 상대 명령은 그사이 남이 바꿨을 때 엉뚱한 자리로 간다.
- ⚠️ **`moveSlot` 은 끝에서 감기지 않는다.** 감싸면 맨 위 상품을 올리려다 맨 아래로 보낸다 — 되돌리기 전에는 눈치채기 어렵다. 끝 행의 버튼은 아예 잠근다.
- **첫 화면 경계에 선을 긋는다.** 진열은 8칸인데 상점 첫 화면은 6칸이라, 순서를 바꿀 때 **무엇이 밀려나는지**가 보여야 한다. 미리보기가 그 6칸을 그대로 그린다.

**진열은 아이템을 가리키기만 한다** (`ShopSlot = { itemKey }`). 이름·가격·그림을 복사해 두면 아이템을 고쳤을 때 상점만 옛 값을 들고 있게 된다.

---

## 25. 운영

공지 · 이벤트 · 지급/회수. 운영자가 **게임 밖에서 게임 안을 건드리는** 수단이다. 공지·이벤트는 기간이 지나면 저절로 끝나지만, **지급·회수는 되돌릴 수 없다.**

### 25.1 기간제 상태는 저장하지 않는다

공지와 이벤트는 「게시중/진행 · 예약 · 종료」 를 갖는데, **이건 날짜에서 나오는 값**이다(`periodStatusOf`). 손으로 들고 있으면 기간이 지나도 「게시중」 인 채로 남는다 — 챌린지에서 이미 정한 규칙과 같다(§20.2).

⚠️ **종료일이 비면 끝나지 않는다.** 「상시」 이벤트가 그것이다. 빈 문자열을 그냥 날짜로 비교하면 `'' < today` 가 참이라 **항상 종료로 잡힌다.**
⚠️ **시작일·종료일 당일은 진행 중이다.** 시작일 당일에 「예약」 이면 그날 아무것도 안 뜬다.

**상태를 화면이 아니라 파사드가 낸다.** 화면에서 `today()` 를 부르면 열마다 다른 날을 쓸 수 있고, 자정을 넘기며 한 표 안에서 값이 갈린다. 파사드가 `NoticeEntry { notice, status }` 로 붙여 준다.

**게시 전에는 조회수를 「—」 로 그린다.** `0` 을 그대로 찍으면 「아무도 안 봤다」 로 읽히는데, 실제로는 아직 셀 것이 없다. 이벤트의 「참여」 도 같다.

**상단 고정은 게시 중인 것만 센다.** 끝난 공지에 고정 표시가 남아 있어도 앱에는 안 뜨는데, 그것까지 세면 자리가 남았는데도 「가득 참」 으로 보인다. 권장치(2건)를 넘을 때만 붉게 칠하고 배너를 띄운다 — 2건은 정상이라 늘 빨가면 아무 뜻이 없다.

### 25.2 이벤트 카드

**진행 → 예약 → 종료 순으로 정렬한다.** 끝난 이벤트가 섞여 있으면 무엇이 라이브인지 한눈에 안 보인다. 같은 상태 안에서는 최근 시작한 것이 위고, 동률은 `key` 로 고정한다 — 새로고침마다 순서가 바뀌면 안 된다.

⚠️ **`sortEvents` 는 원본 배열을 건드리지 않는다.** `Array#sort` 는 제자리에서 정렬하므로, 캐시된 배열을 그대로 넘기면 다음 조회의 순서까지 바뀐다.

⚠️ **카드 왼쪽 띠 색(`accent`)은 장식 전용이다.** 기획이 넣는 `#RRGGBB` 라 `check-contrast.ts` 가 못 본다 — **글자 색으로 절대 쓰지 말 것.**

**보상 아이템이 지워졌을 수 있다.** 빈 칸을 두지 않고 「삭제된 아이템」 이라고 붉게 적는다 — 이벤트는 도는데 줄 것이 없는 상태이므로 운영자가 알아야 한다.

### 25.3 지급 · 회수 — 실행 전에 대상을 센다

이 화면의 사고는 둘이다. **오타 난 회원 ID** 와 **잘못 잡은 전체 대상.** 둘 다 실행하면 되돌릴 수 없다.

그래서 「실행」 버튼이 바로 실행하지 않는다.

```text
「대상 확인 후 실행」 → 서버가 대상을 센다 → 확인 창에 몇 명인지 적는다 → 실행
```

확인한 결과는 **조건이 바뀌는 순간 버린다**(`check.reset()`). 대상을 세어 둔 뒤 항목이나 수량을 바꾸면 그 숫자는 거짓이다.

**못 찾은 id 를 숨기지 않는다.**

```text
U-10240, U-99999, u-10240, U-88888
  → 1명에게 파란보석 100개를 지급합니다.
     찾지 못한 회원 2명은 제외됩니다 — U-99999, U-88888
```

`parseUserIds` 가 **쉼표·줄바꿈으로 나누고 대문자로 맞추고 중복을 없앤다** — 운영자는 스프레드시트에서 복사해 붙이므로 줄바꿈과 뒤따르는 쉼표가 섞여 온다. ⚠️ **탈퇴 회원도 「못 찾음」 이다** — 계정이 없으니 줄 곳도 없는데 조용히 넘어가면 운영자는 준 줄 안다.

⚠️ **대상이 0명이면 실행하지 않는다.** 성공으로 끝내면 이력에는 남는데 아무에게도 안 간 처리가 생긴다. 파사드에서 막는다(§22.2.3 — 잠근 버튼은 검증이 아니다).

### 25.3.1 값이 있다는 것과 쓸 수 있다는 것은 다르다

`validateGrant` 가 「비었는가」 만 보면 통과하는 값들이 있다.

| 입력 | `> 0` · `!== null` | 실제 |
|---|---|---|
| `Infinity` | 통과 | 자릿수 많은 값을 붙여 넣으면 `Number` 가 이걸 준다 |
| `NaN` | 막힘(비교가 거짓) | — |
| `1.5` | 통과 | 재화는 정수다 |
| 지워진 `itemKey` | 통과 | **없는 아이템을 「성공」 으로 기록한다** |

그래서 수량은 **정수 · 1 이상 · `QTY_MAX`(100만) 이하**로 좁히고, 아이템은 `checkGrantItem` 이 **실재 여부까지** 본다. 상한을 두는 이유는 성능이 아니라 **오타 하나가 전체 유저에게 나가는 화면**이라 사람이 실수할 자리를 줄이는 것이다.

⚠️ 아이템 검사는 폼이 아니라 **실행 직전에도** 한다. 폼을 열어 둔 사이에 아이템이 지워질 수 있다(§22.2.3 — 잠근 버튼은 검증이 아니다).

### 25.3.2 확인을 버릴 때는 버렸다고 말한다

「대상 확인 후 실행」 을 누른 뒤 **입력을 바꾸면 그 확인은 거짓**이 된다. 그래서 버리는데, 그냥 버리면 `onSuccess` 가 안 불려 **눌러도 아무 일이 없다.**

```text
「실행」 누름 → 250ms 도는 사이에 사유를 계속 타이핑
                → 확인 결과 폐기 · 창도 안 뜨고 아무 표시도 없음
```

사람은 버튼을 누르고 계속 타이핑한다. 그래서 버린 뒤 **「입력이 바뀌어 대상 확인이 취소됐습니다」** 를 띄운다.

**대상이 0명이면 확인 창을 아예 열지 않는다.** 확인할 것이 없는데 창을 띄우면 「확인」 버튼이 아무 일도 안 하거나, 눌러서 0명짜리 처리를 보내게 된다. 대신 그 자리에서 **못 찾은 ID 를 적어 준다.**

**실행은 확인한 그 입력으로 한다** (`check.variables`). 창이 떠 있는 동안은 네이티브 `<dialog>` 가 배경을 inert 로 만들어 폼이 바뀔 수 없지만, **보여 준 것과 보내는 것이 같다**는 것을 코드로 못박아 둔다.

**「등급」 대상을 뺐다.** 원본은 `개별 · 등급 · 전체` 셋인데 **회원 등급이라는 것이 우리 도메인에 없다.** 골라도 고를 것이 없는 선택지는 막다른 길이라, 둘만 두고 그 자리에 「등급이 생기면 추가됩니다」 를 적었다.

**「처리자」 는 클라이언트가 보내는 값이 아니다.** 지금은 목이라 화면이 로그인한 사람의 이름을 넘기지만, 실서버에서는 **세션에서 가져가야 한다** — 보낸 값을 그대로 적으면 감사 이력에 아무 이름이나 남길 수 있다.

**재화 이름은 원본과 다르다.** 원본 운영 화면은 「주황보석」 이라 부르는데, 우리 코드와 회원 상세는 **「노란보석」** 이다(`Wallet.topaz`). 디자인 파일 사이의 불일치라 **코드에 이미 박힌 쪽을 따랐다** — 회원 상세와 지급 화면이 같은 재화를 다르게 부르면 그게 더 큰 사고다.

⚠️ **지급 재화 합에 아이템을 더하지 않는다.** 「젬 600 + 아이템 1」 을 601 로 세면 아무 뜻도 없는 값이 된다. 그리고 재화인지 아이템인지는 **이름이 아니라 종류(`asset`)로 가른다** — 아이템 이름이 「파란보석 상자」 일 수도 있고, 이름이 바뀌면 지난 이력의 종류까지 달라진다.

---

## 26. 푸시 알림

목록 · 작성 · 상세 셋. **보내면 되돌릴 수 없고, 마케팅은 법이 시간을 제한한다.**

### 26.1 길이 제한은 막는 것이 아니라 알리는 것이다

제목 40자 · 본문 90자는 **잠금화면에서 대부분 안 잘리는 선**이지 규격이 아니다. 기기마다 다르다.

그래서 두 가지를 같이 한다 — 세는 것(`12 / 40자`)과 **실제로 잘리는 모양을 보여 주는 것**. 미리보기가 제목 한 줄 · 본문 두 줄에서 자른다. 숫자만 보여 주면 "40자가 왜 넘으면 안 되는가" 를 알 수 없다.

### 26.2 ⚠️ 야간 마케팅 발송은 **「지금 발송」 도** 막는다

정보통신망법상 광고성 정보를 21시–08시에 보내려면 별도 동의가 필요한데, 우리는 그 동의를 받지 않으므로 **아예 막는다.**

원본은 **예약일 때만** 막았다.

```js
const night = pf.kind === 'marketing' && pf.when === 'later' && (hour >= 21 || hour < 8)
//                                       ^^^^^^^^^^^^^^^^^^^ 예약이 아니면 검사조차 안 한다
```

**밤 11시에 「지금 발송」 을 누르면 그대로 나간다.** 법이 제한하는 것은 예약 여부가 아니라 **도착 시각**이다. `nightBlocked(kind, at)` 은 시각 하나만 받고, 화면은 「지금 발송」 이면 `nowAt()` 을 넣는다.

- **경계는 포함이다** — 21시 정각은 막히고 08시 정각은 된다. 하나만 틀려도 그 시각에 나간다.
- **서비스·루틴은 제한이 없다.** 점검 안내는 새벽에 보내야 의미가 있다(정보성).
- **시각을 못 읽으면 막지 않는다.** 형식 오류는 `validatePush` 가 따로 말한다 — 한 가지 잘못을 두 군데서 말하면 어느 것을 고쳐야 할지 모른다.
- ⚠️ **자르기(`slice(11,13)`)로 시를 읽지 말 것.** `2026-08-14T22:00` 처럼 모양이 다른 값에서 판정이 갈린다. `hourOf` 가 형식을 확인하고 아니면 `null` 을 준다.

**서버도 다시 막는다.** 「지금」 은 **처리하는 쪽이 정할 값**이라, 파사드가 클라이언트가 보낸 시각을 믿지 않고 `nowAt()` 을 다시 읽는다(§22.2.3).

### 26.2.1 모양이 맞는 것과 존재하는 시각은 다르다

`hourOf` 가 정규식만 봤더니 **`2026-02-30 10:99` 가 통과**했다. 시(10)를 읽어 돌려주므로 `validatePush` 도 통과하고, **영원히 안 나갈 예약**이 저장된다.

```text
2026-02-30 10:00  → 2월 30일은 없다 (3월 2일로 넘어간다)
2026-04-31 10:00  → 4월은 30일까지
2026-08-14 10:99  → 99분
```

달력에 실제로 있는 날인지 되돌려 확인하고(`Date.UTC` 왕복), 분이 59 이하인지 본다. 윤년은 통과한다 — `2028-02-29` 는 있고 `2026-02-29` 는 없다.

### 26.3 대상 수는 **동의를 거른 뒤**의 값이다

원본은 목록과 작성 화면이 서로 다른 말을 했다.

| | 마케팅 푸시를 「전체」 에게 |
|---|---|
| 목록의 `대상` | **41,200** (전체 회원) |
| 작성 화면의 「예상 대상」 | **28,600** (마케팅 동의 69%) |

같은 것을 세는데 값이 다르면 운영자는 어느 쪽도 못 믿는다. 목 데이터의 대상 수를 **작성 화면과 같은 함수(`reachOf`)로** 다시 냈다.

⚠️ **`Math.min(대상, 마케팅동의)` 로 하면 안 된다.** 원본이 그랬는데, 휴면 회원 6,200명에게 마케팅을 보낼 때 `min(6200, 28600) = 6200` 이라 **동의를 하나도 안 거른 값**이 나온다. 조건별 동의 수는 서버가 주지 않으므로 전체 비율(`marketing / push`)을 곱한다 — 휴면이면 4,553명이다.

⚠️ **「푸시 거부」 를 도달 실패에 넣지 않는다.** 대상이 이미 푸시를 켠 사람만 세었으므로 **두 번 빼는 것**이 된다. 원본은 실패 목록 첫 줄이 「푸시 거부」 였다. 남는 것은 토큰 만료 · 기기 미등록 · 일시 오류이고, **셋의 합이 「대상 − 도달」 과 정확히 같아야 한다** — 비율로 세 번 반올림하면 어긋난다(마지막 줄에 나머지를 담는다).

### 26.3.1 ⚠️ 사람을 지목할 때 **집계 비율**을 쓰면 안 된다

`reachOf` 가 「직접 지정」 에도 전체 동의율을 곱하고 있었다.

```text
1명 지목 → floor(1 × 0.7345) = 0명
3명 지목 → 2명   ← 그 2명이 누구인지 아무도 모른다
```

**세그먼트에는 비율이 맞다** — 「휴면 회원 6,200명」 은 개인이 아니라 모수라, 그중 몇 %가 동의했는지가 최선의 추정이다. **개인을 지목할 때는 아니다.** 각자 동의했는지는 조회하면 알 수 있는 사실이고, 추정할 이유가 없다.

그래서 둘을 갈랐다.

| | 무엇으로 세는가 |
|---|---|
| `segmentReach` | 조건별 모수 × 마케팅이면 동의 비율 |
| `directTargets` | **회원을 실제로 조회**해 없는 사람 · 탈퇴 · 미동의를 각각 가른다 |

`User.marketingOptIn` 을 더했다. 화면은 회원 목록을 갖고 있지 않으므로 **「최대 N명」 이라고 상한으로 표시**하고, 보내기 전에 파사드가 풀어 본 결과를 확인 창에 적는다.

```text
U-10240, U-10241, U-10248, U-10249, U-99999   (미동의 둘 + 오타 하나)
  화면    최대 5명 · 「마케팅에 동의하지 않은 회원은 보낼 때 빠집니다」
  확인창  2명에게 마케팅 알림을 보냅니다.
          찾지 못한 회원 1명 · 마케팅 미동의 2명 은 제외됩니다.
```

전부 빠져서 0명이면 **확인 창을 열지 않고** 그 자리에서 이유를 말한다(§25.3.2). 파사드도 0명이면 거부한다.

**0% 와 「아직 없음」 은 다르다.** 예약 건의 열림률을 0% 로 그리면 **실패한 것처럼** 보인다. `openRate` 는 `null` 을 주고 화면이 「—」 로 그린다.

⚠️ **모수가 0 이면 `NaN%` 가 화면에 뜬다.** `share(part, total)` 이 0 일 때 「—」 를 준다. 0% 로 그리는 것도 틀렸다 — 0% 는 "있는데 하나도 안 됐다" 는 뜻이다.

**평균 열림률은 합계 기준이다.** 건별 비율의 평균이면 1명에게 보내 1명이 연 건(100%)이 평균을 끌어올린다.

### 26.4 ⚠️ 차트의 왼쪽 여백을 음수로 두면 첫 막대가 잘린다

`BarChart` 가 `margin={{ left: -30 }}` 이었다. `YAxis hide` 는 자리를 아예 안 잡으므로 뺄 것이 없는데, 음수 여백이 그림 영역을 통째로 왼쪽으로 밀어 **첫 칸이 화면 밖으로 나갔다.**

**대시보드에서 14일 중 하루가 그렇게 사라져 있었다.** 눈으로는 "막대가 13개인가 14개인가" 를 세지 않으므로 안 보인다 — 첫 막대의 `x` 좌표를 재서 알았다(`-14`). 푸시 상세를 만들다 12칸 중 한 칸이 비어 보여서 따라간 것이 시작이다.

같은 김에 **한 계열만 그리는 경우**를 열었다(`legend: [string]`). 없을 때는 빈 2계열(`b: 0`)을 넘겨야 했는데, 그러면 범례에 이름 없는 색 조각이 하나 더 붙는다.

---

## 27. 고객 소통 — FAQ

FAQ 는 **두 곳에서 쓰인다.** 앱의 도움말 목록이자, 1:1 문의 답변의 템플릿이다. 이 사실이 아래 규칙 대부분의 이유다.

### 27.1 「앱에 노출」 은 저장 필드다

원본은 노출 여부를 **점수에서 유추**했다.

```js
const vis = st.faqVis[id] === undefined ? (help >= 60) : st.faqVis[id]
//                                        ^^^^^^^^^^^ 도움됨이 60% 넘으면 노출
```

그러면 **운영자가 내린 것과 점수가 낮은 것이 구분되지 않는다.** 「왜 이게 안 보이지」 에 화면이 답할 수 없고, 점수가 오르면 내려 둔 글이 저절로 올라온다.

`Faq.visible` 을 저장 필드로 두고, 목 데이터에 **일부러 하나를 꺼 뒀다** — 「끔」 이 화면에 실제로 나타나야 그 상태가 있다는 것을 안다.

⚠️ **끄는 것은 지우는 것이 아니다.** 앱에서만 감추고 **답변 템플릿으로는 계속 쓸 수 있다**(`replyTemplates` 가 전부 준다). 「내부 안내용」 FAQ 가 그 자리다. 그래서 노출 토글은 확인 창 없이 바로 반영하고, **삭제만** 확인을 받는다 — 지우면 답변 템플릿에서도 사라진다.

**「손봐야 함」 은 노출 중인 것만 센다.** 이미 내린 글은 손볼 이유가 없다.

### 27.2 거른 상태에서는 순서를 못 바꾼다

**배열 순서가 곧 앱 노출 순서**다. 분류로 거른 목록에서 「위로」 를 누르면 **화면에 없는 항목과의 상대 순서를 알 수 없다** — 「결제」 만 보면서 2번을 올렸을 때 그 사이에 있던 「계정」 글보다 위인지 아래인지 정할 방법이 없다.

그래서 「전체」 에서만 옮길 수 있고, 다른 탭에서는 버튼을 **잠그고 이유를 적는다**(없애면 왜 안 되는지 알 수 없다). 순서는 초안으로 들고 있다가 「순서 저장」 에서 한 번 보낸다(§24.3 과 같은 규칙).

**저장은 순서 전체를 보내고, 요청에 없는 항목은 뒤에 붙인다.** 그사이 남이 등록했어도 **사라지지 않고 맨 뒤로 밀린다** — 순서가 흐트러지는 것과 글이 없어지는 것은 다른 무게다.

### 27.2.1 ⚠️ 초안이 있으면 화면은 초안만 본다

순서를 바꾸면 목록이 `draft` 로 넘어간다. 그 상태에서 노출 토글을 누르면 **서버는 바뀌는데 스위치가 반응하지 않는다** — 무효화로 새 데이터가 와도 `draft` 가 그걸 가린다.

초안을 쓰는 화면에서는 **그 초안도 같이 고쳐야 한다.** 「서버에 보냈으니 끝」 이 아니다.

```ts
toggle.mutate({ faqId, visible }, {
  onSuccess: () => setDraft((prev) => prev && prev.map((f) => (f.key === faqId ? { ...f, visible } : f))),
})
```

⚠️ **줄마다 스위치가 있는 표에서는 라벨을 화면에서만 숨긴다** (`Switch labelHidden`). 「노출」 처럼 짧게 줄이면 화면은 깔끔하지만 **스크린리더가 어느 줄의 스위치인지 말하지 못한다** — 같은 이름이 열여덟 개가 된다. 라벨에는 무엇의 스위치인지 다 적고 감춘다.

### 27.5 없는 것을 고치면 오류다 — 새로 만들지 않는다

`upsert` 는 편하지만 **`key` 를 줬는데 대상이 없을 때**가 함정이다. 그냥 생성으로 흘러가면, 다른 탭에서 지운 뒤 열어 둔 편집 화면에서 저장했을 때 **지운 글이 되살아난 것처럼 보인다** — 실제로는 번호가 다른 새 글이다.

`key` 가 있으면 **찾거나 실패한다.** 못 찾으면 404 로 「목록에서 다시 여세요」 를 말한다.

### 27.3 서버 값을 `useEffect` 로 폼에 복사하지 않는다

수정 화면은 서버가 준 값으로 시작한다. 이걸 `useEffect` 로 `setState` 하면 **한 번 그린 뒤 덮어쓰게 되고**, 응답이 늦으면 그사이 사용자가 친 글자가 사라진다. ESLint 의 `react-hooks/set-state-in-effect` 가 막는 것도 이 이유다.

대신 **초안이 있으면 초안, 없으면 서버 값**으로 읽는다.

```ts
const [draft, setDraft] = useState<FaqInput | null>(null)
const form = draft ?? loaded ?? EMPTY
```

손대는 순간 초안이 생기므로 그 뒤로는 서버 값이 와도 덮이지 않는다. `useUnsavedGuard(draft !== null)` 로 미저장 표시도 같은 값에서 나온다 — 「손댔는가」 를 두 군데서 따로 세지 않는다.

### 27.4 새로 등록한 것은 `0` 이 아니라 「—」

새 FAQ 는 조회수도 도움됨도 없다. `0` 과 `0%` 로 그리면 **「아무도 안 봤고 아무도 도움 안 됐다」** 로 읽히는데, 실제로는 아직 잴 것이 없다(§26.3 과 같은 규칙).

---

## 28. 고객 소통 — 1:1 문의

**답변은 앱 알림으로 나간다** — 보내면 유저 화면이 바뀌고 되돌릴 수 없다.

### 28.1 대기 시간은 저장하지 않는다

원본은 `'4시간'` 이라는 **문자열**을 들고 있었다. 시간이 지나도 그대로다.

접수 시각에서 계산하되, **무엇을 재는지가 상태마다 다르다.**

| | 무엇을 재는가 | 왜 |
|---|---|---|
| 열린 건 | **마지막 유저 말 → 지금** | 지금 얼마나 기다리게 하고 있는가 |
| 끝난 건 | 접수 → 첫 답변 | 얼마 만에 답했는가 |

⚠️ **끝난 건에 「지금까지」 를 재면 안 된다** — 어제 답한 문의가 오늘도 계속 늘어나 SLA 가 무너진다.
⚠️ **재문의로 다시 열린 건을 접수 시각부터 재면 안 된다** — 이미 답한 시간까지 합쳐져, 답을 늦게 준 것처럼 보인다. 그래서 `lastAskedAt` 을 쓴다.
⚠️ **`answeredAt` 은 첫 답변 때만 찍는다.** 재문의에 다시 답할 때 갱신하면 「첫 응답까지」 가 계속 줄어 **지표가 저절로 좋아진다.**

**평균 응답은 `firstResponseMinutes`, 「대기」 열은 `waitMinutes`.** 둘을 한 함수로 합치면 위 표가 무너진다.

**「보류」 를 SLA 에서 빼지 않는다.** 개발 확인을 기다리는 것도 유저에게는 기다림이다 — 빼면 보류로 넘긴 문의가 지표에서 사라져 잊힌다. 「답변 대기」 에도 넣는다.

**재문의율의 분모는 답한 건이다.** 답을 안 한 건은 재문의가 나올 수 없어서, 전체로 나누면 비율이 낮게 나온다.

⚠️ **재문의 건은 답변 이력이 있어야 한다.** 원본 목 데이터에 「대기 · 재문의 · 답변 없음」 인 행이 있었는데, **답을 받은 적 없는데 다시 물을 수는 없다.**

### 28.2 작성자는 실제 회원이다

원본은 `solbi_92 · u_10248` 같은 이름을 쓰는데 **회원 목록에 없는 사람**이라, 상세의 「작성자」 패널이 아무 회원과도 대응되지 않는 값(레벨 14 · 62일 · 1,240젬)을 모든 문의에 똑같이 보여 준다.

`Inquiry.userKey` 로 회원을 **가리키기만** 하고, 파사드가 회원 · 그 사람의 결제 · 그 사람의 지난 문의를 합쳐 준다. 화면이 세 곳을 따로 부르면 어느 하나가 늦게 와서 반쯤 그려진 상세가 보인다.

⚠️ **닉네임·레벨을 문의에 복사하지 말 것** — 회원이 바뀌었을 때 문의만 옛 값을 들고 있게 된다.

**회원을 못 찾으면 빈 칸을 두지 않는다.** 「탈퇴했거나 찾을 수 없는 회원입니다. 답변은 앱에 남지만 알림은 가지 않습니다」 라고 적는다 — 빈 칸은 화면이 고장난 것으로 보인다.

**재화 이름은 「노란보석」** 이다. 원본 상세는 「주황보석」 이라 부르는데 코드와 회원 상세가 「노란보석」 이라, 같은 재화를 화면마다 다르게 부르는 쪽이 더 큰 사고다(§25.3 과 같은 판단).

### 28.3 「FAQ로 등록」 은 실제로 채워 준다

같은 질문이 또 오지 않게 하는 것이 CS 의 목적이다. 문의 제목과 **지금 쓰고 있는 답변**을 주소에 실어 FAQ 폼을 연다.

```text
/support/faq/edit?q=기기를 바꿨는데 캐릭터가 사라졌어요&a=기기 변경 시에는 …
```

답변을 옮겨 적게 하면 아무도 안 한다. 잠긴 버튼으로 두는 것보다 **한 번 더 이어 주는 쪽**이 이 화면에서는 값이 크다.

**답변 템플릿은 FAQ 전부**를 준다 — 앱에 안 보이는 것도 포함이다(§27.1).

### 28.4 ⚠️ 스위치가 있으면 그 값이 계약에 있어야 한다

「앱 알림 발송」 스위치를 만들고 확인 창 문구까지 그 값에 따라 바꿔 놓고, **요청에는 안 실었다.** 운영자는 껐다고 믿는데 아무 데도 전달되지 않는다 — 잠긴 버튼보다 나쁘다. 잠긴 버튼은 안 된다고 말이라도 한다.

`ReplyVars.notify` 를 계약에 넣고, **결과가 보이게** 했다. 답변 이력에 `notified` 를 남기고 알림 없이 남긴 답변에는 「알림 없음」 을 붙인다.

```text
스위치 끔 → 확인창 「소이 님에게 답변이 전달됩니다」        → 이력에 「알림 없음」
스위치 켬 → 확인창 「… 앱 알림도 함께 갑니다」              → 배지 없음
```

⚠️ **없거나 이미 탈퇴한 회원에게는 켜져 있어도 안 갔다고 기록한다.** 갔다고 남기면 나중에 「답을 안 줬다」 는 문의가 다시 왔을 때 근거가 거짓이 된다.

⚠️ **씨앗 데이터에도 같은 규칙을 건다.** 새 답변에만 걸고 목 데이터는 전부 「알림 갔음」 으로 두면, **화면이 스스로 모순된다** — 탈퇴 회원의 지난 답변만 배지가 없다. 지난 답변은 상태가 아니라 **시점**으로 가른다: 탈퇴 **전에** 답한 것은 실제로 갔다.

```ts
const notified = user.leftAt === '' || answeredAt < user.leftAt
```

> 규칙으로 적으면 **컨트롤을 만들기 전에 그 값이 갈 곳부터 정한다.** 갈 곳이 없으면 만들지 않거나(§18.8 잠근 버튼), 만들되 계약을 같이 낸다.

---

## 29. 코드 — 공통 코드

드롭다운과 배지에 쓰이는 값을 한곳에서 관리한다. **값 하나가 여러 화면을 동시에 바꾼다.**

### 29.1 ⚠️ 쓰이는 값은 지울 수 없다 — 감추기가 그 자리다

`ACCOUNT` 를 412건이 들고 있는데 그 값을 지우면, **그 412건이 무엇인지 알 수 없게 된다.** 코드 값은 저장된 데이터가 문자열로 들고 다니는 것이라 참조 무결성이 앱 바깥에 있다.

| | 무엇이 달라지는가 |
|---|---|
| **감추기** | 드롭다운에서 사라져 **새로 못 고른다.** 기존 데이터는 그대로 그 값을 갖는다 |
| **지우기** | 되돌릴 수 없다. **`uses === 0` 일 때만** 허용한다 |

⚠️ **감춰 뒀어도 쓰이면 못 지운다.** 「안 보이니까 이제 필요 없겠지」 가 가장 흔한 사고다.

삭제 버튼은 없애지 않고 **잠그고 라벨을 「사용 중」 으로 바꾼다** — 없으면 왜 못 지우는지 알 수 없다(§18.8).

**파사드도 다시 막는다.** 화면이 잠가도 저장 요청에서 쓰이는 값이 빠졌으면 409 다 — 잠근 버튼은 검증이 아니다(§22.2.3).

⚠️ **`uses` 는 화면이 못 고친다.** 집계 결과라 서버가 소유한다. 저장할 때 화면이 보낸 `uses` 를 그대로 쓰면 **「쓰이는데 지울 수 있는」 값**이 생긴다.

### 29.2 사용처는 실제 화면으로 간다

원본은 `riruti-admin-cs.dc.html#qna` 처럼 **디자인 파일**을 가리킨다. 어드민 안에서는 열 수 없는 주소라, 「어디서 쓰나」 를 보러 온 사람이 그 화면으로 못 간다.

`CodeUsage.screen` 을 `ScreenId` 로 두고 `SCREENS[screen].path` 로 이동한다 — **화면 이름도 레지스트리에서 가져오므로** 이름을 바꿔도 따라온다.

**상단에 「N개 화면이 이 코드를 참조합니다」 를 먼저 띄운다.** 이 화면에서 가장 중요한 문장이다 — 값 하나를 건드리면 세 화면이 같이 바뀐다는 사실을 손대기 전에 말한다.

### 29.3 코드 키는 등록 뒤에 못 바꾼다는 전제로 만든다

저장된 데이터가 이 문자열을 그대로 들고 다니므로, 바꾸면 기존 데이터가 전부 미아가 된다. 그래서 **등록 화면에서 최대한 잘 정하게 돕는다.**

- **영문 대문자로 시작하고 대문자 · 숫자 · 밑줄** (`isCodeKey`). `Account` 와 `ACCOUNT` 가 다른 값이 되면 비교가 조용히 어긋난다. ⚠️ **숫자를 막으면 안 된다** — 시즌 코드가 `S1` · `S2` · `S3` 다. 규칙 문장은 `CODE_RULE_TEXT` 하나에서 나와 **오류 메시지와 화면 안내가 갈라지지 않는다.**
- **「자동」 은 제안일 뿐이다.** 그룹명의 낱말을 사전으로 옮긴다(문의→QNA, 유형→KIND). ⚠️ **제안한 키는 언제나 쓸 수 있는 값이어야 한다** — 한글만 있거나 비었을 때 못 쓰는 값을 내놓으면 자동이 아무 도움이 안 된다.
- **코드 입력칸은 대문자로 강제한다.** 소문자를 치면 그 자리에서 올린다.
- **중복 키는 대소문자 구분 없이 막는다.** 서버가 준 목록은 대문자 보장이 없다.

⚠️ **값 목록의 중복 검사에는 `toUpperCase()` 를 쓰지 않는다.** 그 앞에서 `isCodeKey` 가 이미 대문자를 보장하므로 **도달할 수 없는 방어**가 되고, 테스트가 증명할 수 없는 코드가 남는다. 소문자는 「중복」 이 아니라 「모양」 으로 막힌다 — 두 메시지를 갈라 둔다.

**빈 줄은 값으로 세지 않는다.** 폼이 빈 줄을 들고 있는 것은 정상이고, 저장할 때 걸러 낸다. 반쯤 채운 줄은 막는다.

### 29.3.1 ⚠️ 검증한 값과 저장할 값은 같아야 한다

다듬기(`trim`)를 **검증과 저장 두 곳에서** 하고 있었다. 지금은 두 곳이 같은 일을 해서 결과가 맞지만, **한쪽만 고치면 검증을 통과한 것과 다른 값이 저장된다** — 등록 뒤 못 바꾸는 키가 그렇게 어긋나면 되돌릴 방법이 없다.

`normalizeCodeGroupInput` 하나로 모으고, 파사드가 **다듬은 값으로 검증하고 그 값을 그대로 저장**한다. 목은 다듬지 않는다.

⚠️ **정규화는 두 번 해도 같아야 한다**(멱등). 아니면 어디서 몇 번 불렀는지가 결과를 바꾼다.

### 29.3.2 ⚠️ 폼만 막으면 다른 경로로 새어 든다

값의 코드 중복을 **등록 폼에서만** 막고 있었다. 상세의 「순서 저장」 은 같은 목록을 통째로 보내는데 거기에는 검사가 없어서, **중복 코드가 그대로 저장된다.**

```text
HEAD BODY HAND FACE + HEAD 를 다시 → HEAD BODY HAND FACE HEAD
```

`hasDuplicateCodes` 를 도메인에 두고 **두 경로가 같은 함수**를 쓴다.

**이탈 방지도 같은 종류다.** 「이름·키가 비었으면 안 건드린 것」 으로 봤는데, 설명·분류·값만 채운 사람은 **경고 없이 잃는다.** 폼 전체를 초기값과 비교한다.

---

## 30. 코드 — 쿠폰

코드를 발급하고 사용 현황을 본다. **코드는 사람이 손으로 옮겨 적는다.**

### 30.1 ⚠️ 발급 수 `0` 은 「무제한」 이지 「없음」 이 아니다

단일 코드는 몇 명이 쓸지 **미리 정하지 않는다.** 원본은 그 자리를 `0` 으로 두고 사용률을 이렇게 냈다.

```js
const p = c[5] ? Math.round(c[4] / c[5] * 100) : null
pct: (p == null ? 100 : p) + '%'
//    ^^^^^^^^^^^^^^^^^^^ 분모가 없으면 100%
```

**무제한 쿠폰이 「다 썼다」 로 보인다** — 정반대의 뜻이다. 운영자는 코드를 더 뿌려야 하는 줄 안다.

| | 무제한(`issued: 0`) | 수량 있음 |
|---|---|---|
| 사용률 | `null` → **「—」** | `used / issued` |
| 남은 코드 | `null` → **「—」** | `issued − used` (음수 없음) |
| 목록의 **「사용」** 열 | 「2,914건 · 무제한」 | 막대 + `8,420 / 12,000` |

⚠️ **목록의 그 열을 「사용률」 이라 부르면 안 된다.** 무제한 행은 비율이 없어서 건수를 보여 주는데, 열 이름이 「사용률」 이면 **이름과 내용이 어긋난다.** 열은 비율과 건수를 같이 담으므로 **담는 것을 이름으로** 쓴다 — 상세의 「사용률」 지표는 그대로 「—」 다.

**「발급 코드」 합계는 셀 수 있는 것만이다.** 무제한은 `0` 이라 더해도 합이 안 바뀌므로 거르는 코드를 따로 두지 않는다 — 테스트가 증명할 수 없는 방어가 된다(§29.3).

### 30.2 ⚠️ 자동 생성은 헷갈리는 글자를 안 쓴다

방송 자막·오프라인 인쇄물에서 **사람이 손으로 치는** 값이다. `O` 와 `0`, `I` 와 `1` 이 섞이면 「코드가 안 먹혀요」 문의가 그대로 늘어난다.

```ts
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'   // I · O · 0 · 1 없음
```

⚠️ **이 알파벳을 검증에 쓰면 안 된다.** 운영자가 손으로 정한 `SUMMER2026` 은 뜻이 있어서 오히려 잘 읽히는데, 여기에는 `0` 이 들어 있다 — 이 알파벳으로 막으면 **지금 있는 쿠폰이 전부 걸린다.** 헷갈리는 글자를 피하는 것은 **기계가 만들 때** 지킬 규칙이지 사람이 정할 때의 금지가 아니다. 검증은 `A–Z 0–9 -` 로 더 넓다.

⚠️ **일괄 발급의 접두사를 이름에서 그냥 자르면 안 된다.** 원본은 `name.slice(0,6).toUpperCase()` 라 「사전예약 감사」 가 `사전예약-XXXX` 가 된다 — 코드에 못 쓰는 글자다. 쓸 수 있는 글자만 남기고, 남는 게 없으면 `BULK` 로 떨어진다.

> `generateCouponCode(rand)` 는 **무작위원을 인자로 받는다.** 안에서 `Math.random` 을 부르면 「헷갈리는 글자가 안 나온다」 를 테스트로 고정할 수 없다.

### 30.3 손으로 멈춘 것이 기간보다 먼저다

⚠️ **순서를 뒤집으면 「중단」 이 「종료」 로 보인다** — 사람이 멈춘 사실이 화면에서 사라지고, 되살릴 수 있는지 판단이 갈린다.

**끝난 쿠폰은 되살리지 않는다.** 기간이 지난 것을 「중단 해제」 로 살리면 기간 설정이 아무 뜻도 없어진다. 버튼은 없애지 않고 **잠그고 라벨을 「기간 종료됨」** 으로 바꾸며(§18.8), 파사드도 409 로 막는다(§22.2.3).

### 30.3.1 ⚠️ 우선순위 규칙이 그대로 구멍이 된다

「중단이 기간보다 먼저」 를 정해 놓고, **「끝났나」 를 그 상태로 물었다.**

```ts
const canStop = (c, today) => couponStatusOf(c, today) !== '종료'
```

멈춰 둔 채 기간까지 끝난 쿠폰은 상태가 **「중단」** 이라 이 검사를 통과한다 — **「중단 해제」 가 성공해서 4월에 끝난 쿠폰이 되살아난다.** 규칙이 스스로를 무력화한 자리다.

```text
봄 시즌 보상 · 기간 2026-03-21 ~ 04-20 · stopped: true · 오늘 08-31
  상태 중단 · canStop true   ← 되살릴 수 있다고 답한다
```

사실 판정(`isExpired`)과 표시 판정(`couponStatusOf`)을 갈랐다. **표시용으로 우선순위를 준 값은 사실 판정에 쓰지 않는다.**

**기간 한정을 안 켰으면 날짜가 지나도 끝나지 않는다.** 「상시」 쿠폰이 그것이다.

### 30.4 방식이 나머지를 정한다

| | 코드 | 수량 | 사용률 |
|---|---|---|---|
| 단일 · 인플루언서 | **하나를 모두가 쓴다** | 없음(무제한) | 없음 |
| 일괄 · 시리얼 | 1인 1코드 (서버가 만든다) | **수량이 곧 상한** | 있음 |

안 쓰는 칸은 **비활성이 아니라 아예 안 그린다.** 단일 코드에 회색 「발급 수량」 이 남아 있으면 「왜 못 쓰지」 를 묻게 된다 — 쓸 일이 없는 칸이다.

**검증도 방식을 따라간다.** 단일에 수량을 요구하거나 일괄에 코드를 요구하면, 채울 수 없는 칸 때문에 저장이 막힌다.

### 30.4.1 ⚠️ 방식이 안 쓰는 칸은 저장 전에 지운다

폼은 **방식을 바꿔도 앞서 친 값을 들고 있다.** 그대로 저장하면 이렇게 된다.

| 바꾼 뒤 | 남아 있는 값 | 결과 |
|---|---|---|
| 일괄 → 단일 | `qty: 1000` | **무제한이어야 할 쿠폰이 1,000개 한정**이 된다 |
| 단일 → 일괄 | `code: ''` | 빈 접두사로 저장된다 |

검증은 방식이 안 쓰는 칸을 안 보므로 **둘 다 통과한다.** `normalizeCouponInput` 이 저장 직전에 지우고, 파사드는 다듬은 값으로 검증하고 그 값을 저장한다(§29.3.1).

⚠️ **선착순을 켜고 수량을 0 으로 두면** 상세가 「제한 없음」 으로 보인다 — 운영자가 건 제한이 사라진다. 켰으면 1 이상을 요구한다.

⚠️ **빈 날짜를 「종료일이 시작일보다 빠릅니다」 로 잡으면 안 된다.** `'' < '2026-08-01'` 이 참이라 그렇게 걸리는데, 메시지가 틀렸을 뿐 아니라 **기간 검증을 통째로 지워도 테스트가 통과한다.** 테스트는 메시지까지 본다.

---

## 31. 관리자 — 계정

관리자 계정은 **이 어드민의 열쇠**다. 다른 화면은 틀리면 데이터가 이상해지지만 여기는
틀리면 **아무도 못 들어온다** — 되돌리려면 서버에 직접 손대야 한다.

### 31.1 ⚠️ 로그인할 수 없는 수단을 계정에 달지 않는다

원본 `ADMINS` 는 2차 인증 수단으로 `앱 OTP` 와 **`이메일 코드`** 를 썼고 7명 중 3명이
후자였다. 그런데 우리 로그인은 §11 에서 **TOTP 와 백업 코드로 고쳤다** — 이메일로 코드를
받는 경로가 화면에도 서버 계약에도 없다.

그대로 옮기면 **2차를 통과할 방법이 없는 계정**이 셋 생긴다. 화면은 멀쩡히 「이메일 코드」
라고 적어 두고, 그 사람이 로그인을 시도하면 우리가 그릴 화면이 없다.

`AdminMfa` 를 `'앱 OTP' | '미설정'` 둘로 줄이고 목 데이터도 옮겼다. **계정에 붙는 값은
그 값으로 실제로 로그인할 수 있어야 한다.**

같은 이유로 상세의 「최근 활동」에서 **「생체 인증으로 로그인」 을 지웠다.** 패스키는
아직 없어서(§9 미구현 목록) 그 로그는 **일어난 적 없는 일**이다. 패스키 *등록 여부*는
계정 상태라 원본대로 두되(§21.4 의 퍼블리싱 기준), **로그인 기록은 우리 시스템이 실제로
한 일만** 적는다.

### 31.2 ⚠️ 지표와 탭이 같은 집합을 세게 한다

원본은 「대기 · 정지」 를 두 곳에서 서로 다르게 셌다.

| | 판정 | 한소희(휴면) |
|---|---|---|
| 지표 카드 | `상태 !== '활성'` | **센다** |
| 탭 필터 | `상태 === '대기' \|\| === '정지'` | 안 보여 준다 |

**「대기 · 정지 2」 라고 써 놓고 누르면 1건이 나온다.** 운영자는 한 건이 어디로 사라졌는지
알 수 없고, 실제로는 사라진 게 아니라 애초에 세지 말았어야 할 것을 센 것이다.

`isPending` 하나를 만들어 둘이 함께 쓴다. **라벨이 「대기 · 정지」 면 그 둘만 센다** —
휴면은 막힌 상태가 아니라 안 들어온 상태라 성질이 다르다.

> 같은 값을 두 곳에서 각자 계산하면 언젠가 어긋난다. §30.3.1 과 같은 종류의 사고다.

### 31.3 ⚠️ 정지는 상태가 아니라 덮개다

`state` 를 `'정지'` 로 덮어쓰면 **원래 상태를 잃는다.**

```text
윤태오 · 대기(한 번도 로그인 안 함)
  정지  → state = '정지'      ← 「대기」 였다는 사실이 지워진다
  해제  → state = '활성' ?    ← 로그인한 적도 없는 계정이 「활성」 으로 되살아난다
```

그래서 `state`(지나온 상태)와 `suspended`(막았는가)를 나누고, 화면에 보일 값은
`adminStatusOf` 가 둘을 합쳐 만든다. 재현해서 고정했다 — 정지했다 풀면 **`대기` 로**
돌아온다.

**「마지막 최고 관리자」 규칙은 일부러 넣지 않았다.** 도달할 수 없기 때문이다 — 이 화면에
올 수 있는 사람은 최고 관리자뿐이고(`canAccess` 가 `admin` 을 top 에게만 연다), 그가 자기를
못 멈추면(아래) 최고 관리자는 항상 최소 한 명 남는다. **테스트로 고정할 수 없는 규칙은
있어도 지켜지는지 알 수 없다.**

**자기 계정 정지는 막는다.** 누르는 순간 다음 로그인이 끊기는데 풀어 줄 수 있는 사람이
자기 자신이다. 화면이 버튼을 잠그고 파사드가 한 번 더 본다 — **잠긴 버튼은 보이는 것만
막는다.**

### 31.4 ⚠️ 미리보기는 저장될 값을 보여야 한다

「발급될 계정」 카드가 친 그대로를 보여 주면 저장될 값과 다른 것을 약속한다. 이름이
카드라 **「이렇게 만들어집니다」 가 그대로 읽힌다.**

```text
친 값     " JIMIN@Riruti.CO "   ← 앞뒤 공백 · 대문자
카드      " JIMIN@Riruti.CO "   ← 친 그대로
저장      "jimin@riruti.co"     ← 실제로 만들어지는 것
```

미리보기도 `normalizeAdminInput` 을 거친다. 다듬기·검증·저장·미리보기가 **한 함수를**
쓰므로 넷이 어긋날 자리가 없다 (§29.3.1 과 같은 구조).

역할을 바꾸면 그 역할이 안 쓰는 칸도 여기서 지운다 — 운영자로 모듈을 고르다 최고
관리자로 바꾸면, 전체 접근인 계정에 3개만 적힌 기록이 남는다 (§30.4.1).

### 31.5 초대는 막고 회수는 막지 않는다

담당 모듈 0개를 **초대에서는 막고 상세에서는 허용한다.** 비대칭으로 보이지만 두 행위가
다르다.

| | 0개의 뜻 | 판단 |
|---|---|---|
| 초대 | 할 일 없는 사람을 부른다 | **막는다** — 로그인해도 볼 화면이 없다 |
| 상세에서 해제 | 권한을 거둔다 | 허용 — 퇴사·사고 대응의 정당한 조작 |

다만 **완전히 잠기지는 않는다.** `me` 스코프(내 계정 보안)는 `canAccess` 가 무조건
통과시켜서(§10), 모듈이 0개여도 자기 2단계 인증은 켤 수 있다. 그래서 상세의 경고 문구도
「접근할 수 있는 화면이 없습니다」 가 아니라 **「없음 · 내 계정 보안만 열립니다」** 다 —
화면이 사실보다 세게 말하면 다음 사람이 그 말을 믿고 판단한다.

### 31.6 고를 수 있는 스코프는 `ScopeId` 전체가 아니다

`ASSIGNABLE_SCOPES` 는 14개고 `ScopeId` 는 16개다. 빠진 둘에는 각각 이유가 있다.

| | 왜 못 고르나 |
|---|---|
| `admin` | 관리자 모듈은 최고 관리자 전용이라 `canAccess` 가 무조건 막는다. 목록에 두면 **체크해도 아무 일이 없는 칸**이 된다 |
| `me` | 내 계정 보안은 누구나 통과한다. **줄 것이 없다** |

⚠️ **`ScopeId` 에 스코프를 더하면 여기에도 더해야 한다.** 안 그러면 새 모듈이 사이드바에는
나오는데 아무에게도 배정할 수 없다. 테스트가 이 둘의 부재만 고정한다 — 새로 더한 것이
빠졌는지는 못 잡으므로 화면을 만들 때 같이 볼 것.

**아이디 중복은 파사드에서 한 번 더 본다.** 화면이 가진 중복 목록은 불러온 시점의 것이라,
그 사이 다른 최고 관리자가 같은 아이디를 발급했으면 통과한다. 같은 아이디가 둘이면
**로그인이 어느 계정인지 알 수 없다.**

### 31.7 ⚠️ 임시 비밀번호를 화면에 띄우지 않는다

원본은 초대 미리보기에 임시 비밀번호를 적어 뒀다.

```js
nfTempPw: 'RT-' + (1000 + (st.nf.email.length * 137) % 9000)
```

두 가지가 잘못이다 — 어깨너머로 읽히는 것도 문제지만, **아이디 길이만으로 계산된다.**
`name@riruti.co` 를 아는 사람은 누구나 그 값을 만들 수 있다.

초대는 **메일로만** 간다. 그 자리에는 받는 사람이 밟을 순서(메일 → 비밀번호 설정 →
2단계 인증 등록)를 대신 뒀다 — 발급하는 사람이 실제로 알아야 하는 것은 그쪽이다.

### 31.8 권한 회수는 저장 버튼을 기다리지 않는다

담당 모듈 체크는 **누르는 즉시 저장된다.** 「저장」 을 눌러야 반영되면, 사고가 나서 권한을
급히 거두는 사람이 창을 닫아 버린 사이 그 계정은 계속 들어올 수 있다.

즉시 반영이라 응답(250ms)을 기다리면 체크가 늦게 움직여 **눌리지 않은 것처럼 보인다.**
화면이 먼저 바꾸고 서버에 보내되, **실패하면 서버 값으로 되돌린다.**

⚠️ **토글마다 전체 목록을 보내므로 응답이 뒤바뀌면 옛 값이 최신을 덮는다.**

```text
빨리 두 번 누름
  ① [a, b] 보냄        ② [a] 보냄
  ② 먼저 도착 · ① 나중 도착
  → 서버 [a, b]   화면 [a]      ← 권한을 뺐는데 남아 있다
```

고치는 길은 둘인데 **누를 때마다 잠그는 쪽은 안 된다** — 250ms 동안 안 눌리면 즉시 반영이
아니게 되고, 애초에 그걸 피하려고 낙관적 갱신을 넣었다. 대신 **줄을 세운다.**

```tsx
queue.current = queue.current
  .then(() => setScopes.mutateAsync({ adminId, scopes: next }))
  .catch(() => setDraft(null))   // 삼키므로 뒤에 선 요청은 계속 간다
```

> 목은 지연이 고정(250ms)이라 **이 사고를 재현하지 못한다.** 줄 세우기는 실서버를 위한
> 것이고, 목에서 잴 수 있는 것은 「빨리 세 번 눌러도 화면과 서버가 같다」 뿐이다.

⚠️ **실패한 요청이 뒤에 선 요청의 초안까지 지우면 안 된다.** 앞의 것이 실패해도 뒤의 것은
아직 살아 있다.

```text
① 업적 해제 보냄 (실패)   ② 운영 추가 보냄 (아직 진행 중)
①의 catch 가 초안을 통째로 버림  → 화면이 옛 서버 값으로 돌아간다
그 창 안에서 ③ 을 누르면 **옛 값을 바탕으로** 다음 목록을 만든다
  → ②·③ 이 겹쳐 저장되고 운영자가 켠 것 둘이 조용히 사라진다
```

지연을 늘려 창을 넓히고 재현했다 — 이도윤(챌린지·업적·고객 소통)에서 ①②③ 을 순서대로
누르면 **업적과 운영이 함께 사라지고** 화면과 서버가 나란히 틀린 값(`dash, shop, user`)이
됐다. 서버와 화면이 **같아서** 눈으로는 사고인 줄 모른다.

**내가 마지막인 경우에만 되돌린다.**

```tsx
.catch(() => setDraft((current) => (current === next ? null : current)))
```

`next` 는 토글마다 새로 만드는 배열이라 **참조 비교가 곧 「그 뒤로 아무도 안 눌렀다」** 다.

```tsx
const [draft, setDraft] = useState<ScopeId[] | null>(null)   // null = 서버 값이 진실
const scopes = draft ?? admin.scopes
```

⚠️ **다른 관리자로 옮길 때 `key` 로 초기화한다.** 같은 컴포넌트가 재사용되면 앞 사람의
초안이 뒤 사람 화면에 그대로 남는다.

미저장 경고(§13)는 **붙이지 않는다.** 저장되지 않은 것이 없기 때문이다 — 여기에 경고를
달면 「저장할 게 남았다」 는 거짓말이 된다.

### 31.9 「이 계정으로 보기」 는 예측이 아니라 실행이다

상세의 「사이드바에 표시」 와 「이 계정으로 보기」 가 **같은 함수(`viewerOf` → `visibleNav`)를
쓴다.** 미리보기 목록을 따로 만들면 보여 준 것과 실제로 들어갔을 때가 달라지고, 그 순간
미리보기는 **확인 도구가 아니라 또 하나의 추측**이 된다.

측정: 최지우(캐릭터·배경 · 둥지·레벨) 상세가 예고한 세 그룹이 미리보기 진입 후 사이드바에
정확히 그대로 떴다.

⚠️ **최고 관리자는 미리보기 버튼이 없다.** 지금 보고 있는 것과 똑같아서 보여 줄 것이 없다.

⚠️ **들어가면 이 화면 자체가 안 보인다** (`admin` 스코프). 셸의 리다이렉트에 맡기지 않고
`firstScreen(viewer)` 로 **갈 곳을 정해서** 보낸다 — 돌아오는 길은 상단 배너가 맡는다.

### 31.10 ⚠️ 일어날 수 없는 활동을 보여 주지 않는다

윤태오(대기)는 **한 번도 로그인하지 않았는데** 상세에 로그인 기록 여섯 줄과 「이번 달
활동 37건」 이 떴다. 바로 옆 계정 카드에는 「최초 로그인 — · 아직 로그인하지 않음」 이
적혀 있었다 — **한 화면이 자기 자신과 모순됐다.**

§31.1 에서 「일어난 적 없는 일을 기록으로 남기지 않는다」 고 정해 놓고, 목 데이터를
계정마다 그대로 준 자리에서 같은 실수를 했다. **규칙을 적은 곳과 어긴 곳이 다르면 규칙은
안 지켜진다.**

판정은 **상태(`대기`)가 아니라 사실(`firstLoginAt`)** 로 한다. 계정 카드의 「아직 로그인하지
않음」 과 활동 표가 `hasSignedIn` 하나를 함께 쓰므로 둘이 어긋날 자리가 없다.

> 정지는 덮개라(§31.3) 로그인했던 사실을 지우지 않는다 — 정지된 계정의 활동은 그대로 남는다.

### 31.11 ⚠️ 도메인은 끝만 봐서는 안 된다

`endsWith(ADMIN_EMAIL_DOMAIN)` 하나로는 이것들이 통과한다.

| 값 | `endsWith` | 실제 |
|---|---|---|
| `@riruti.co` | 통과 | 로컬 파트가 없다 |
| `user@other@riruti.co` | 통과 | `@` 가 둘이다 |
| `a b@riruti.co` | 통과 | 공백이 있다 |

전부 **아무도 그 아이디로 로그인할 수 없는 계정**이 된다. 로컬 파트가 비어 있지 않고
`@`·공백이 없는지 함께 본다.

**도메인은 상수에서 잘라 낸다** — 정규식에 `riruti\.co` 를 또 적으면 도메인이 바뀔 때
안내 문구와 검증이 어긋난다.

### 31.12 ⚠️ 상세의 모듈 저장도 고를 수 있는 것만 남긴다

`inviteAdmin` 은 `normalizeAdminInput` 을 거치는데 `setScopes` 는 받은 값을 그대로 저장하고
있었다. **같은 파사드 안에서 한쪽만 다듬으면 다듬는 이유가 사라진다** — 「잠긴 버튼은
보이는 것만 막는다」(§31.3)는 여기에도 똑같이 적용된다.

`assignableOnly` 를 둘이 함께 쓴다. **다만 0개가 되는 것은 막지 않는다** — §31.5 대로
권한 회수는 정당한 조작이고, `me` 스코프 때문에 계정이 잠기지도 않는다.

### 31.13 `Table` 의 `key` 는 타입이 안 잡혔다 → §35 에서 고침

`render` 가 없는 열은 `(row as Record<string, ReactNode>)[c.key]` 로 값을 꺼냈다. 캐스팅이라
**행에 없는 필드를 적으면 에러 없이 빈 칸이 나왔다.** 이번에 「최근 접속」 열이 그렇게
비었다 — 행이 `Admin` 이 아니라 `AdminEntry` 였다.


---

## 32. 관리자 — 감사 로그

이 화면은 **「누가 무엇을 왜 했는가」에 답하는 자리**다. 사고가 났을 때 여기서부터 시작하므로,
없는 일을 보여 주거나 있는 일을 숨기면 조사가 처음부터 틀어진다. 기록 자체는 고칠 수 없으니
**화면이 마지막 방어선**이다.

### 32.1 ⚠️ 한 줄에 기간이 다른 숫자를 나란히 두지 않는다

원본 지표는 「오늘 기록 42」 를 **박아 뒀는데 목록에는 15건뿐**이었다. 42가 어디서 왔는지
아무도 답할 수 없고, 15건짜리 목록 위에 42가 떠 있으면 **목록이 잘려 보인다.** 세어서 낸다.

그리고 그 옆의 「민감 조작」 은 **전체 기간**을 센다 — 필터마다 바뀌면 사고 건수가 아니라
필터 결과가 되기 때문이다(§22.1 과 같은 규칙). 두 칸이 서로 다른 기간을 재고 있으므로
**라벨에 적는다**: 「오늘 기록」 · **「민감 조작 · 전체」**.

> 날짜는 오늘 기준으로 만든다(§21.3). 박아 두면 「오늘 기록」 이 영원히 0 이다.

### 32.2 ⚠️ 분류를 민감도에 얹지 않는다

원본의 분류 함수는 이렇게 생겼다.

```js
const cat = k => RISKY.indexOf(k) >= 0 ? (…재화·결제 / 회원·신고 / 권한…) : '콘텐츠'
```

**「민감 목록에 없으면 전부 콘텐츠」** 다. 그래서 **쿠폰 12,000개 발급이 「콘텐츠」** 로
분류됐다 — 재화 탭을 보는 사람은 그 조작을 영영 못 본다.

분류(무엇에 관한 조작인가)와 민감도(되돌리기 어려운가)는 **다른 축**이다. 한쪽을 다른 쪽에서
끌어내면 축이 하나로 무너진다.

| | 분류 | 민감 |
|---|---|---|
| 쿠폰 발급 | 재화 · 결제 | 아니다 |
| 관리자 초대 | 권한 | 그렇다 |
| 아이템 수정 | 콘텐츠 | 아니다 |

`AUDIT_CATEGORY` 에 종류마다 **명시**한다. 탭 다섯은 원본 그대로 두고 **쿠폰 발급만
재화 · 결제로 옮겼다** — 탭을 늘리는 것보다 잘못 꽂힌 것을 옮기는 쪽이 맞다.

### 32.3 ⚠️ 같은 사실을 두 곳에 적지 않는다

원본은 민감 여부를 **둘 다** 들고 있었다 — 종류 목록 `RISKY` 와 **줄마다의 플래그**(`l[8]`).
15줄을 대조해 보면 지금은 우연히 전부 일치한다. 그래서 더 나쁘다 — **어긋나기 전까지는
아무도 모르고, 어긋나면 민감한 조작이 안 민감한 것으로 쌓인다.**

플래그를 지우고 종류에서만 판정한다(`isRisky`). 목 데이터에도 그 칸이 없다.

### 32.4 ⚠️ 바뀌지 않은 것을 화살표로 그리지 않는다

「숨김 유지」 는 **살펴보고 그대로 두기로 한** 조작이다. 원본은 이것도 `숨김 → 숨김` 으로
빨강 → 초록 화살표를 그렸다. 색과 화살표가 「바뀌었다」 를 말하는데 값은 같아서, **한 번
더 읽어야 안 바뀐 걸 안다.**

`isUnchanged` 면 화살표 대신 한 칸으로 적는다 — **「숨김 · 그대로 유지」**.

### 32.5 쓰기 함수를 만들지 않는다

파사드에 `getAuditLogs` 하나뿐이다. 화면이 「수정과 삭제는 할 수 없습니다」 라고 적어 둔 것을
**코드가 지키는 자리**다 — 여기에 `PATCH`·`DELETE` 를 만들면 그 문구가 거짓말이 된다.
목이어도 같다.

`CSV 내려받기` 는 잠갔다(§18.8) — 내보내기 엔드포인트가 없다.

### 32.6 ⚠️ 선택은 필터를 따라간다

원본은 고른 기록을 **배열 번호**(`aId`)로 들고 있어서, 필터로 목록에서 사라진 기록의 상세가
옆에 그대로 남았다. **「지금 보고 있는 것이 목록에 없다」** 는 상태인데, 조사 화면에서는
그게 제일 나쁜 거짓말이다.

번호가 아니라 **기록 번호로 찾고, 없으면 첫 줄로 떨어진다.**

```tsx
const at = logs.findIndex((l) => l.logId === params.get('log'))
const selected = logs[at >= 0 ? at : 0]
```

효과(`useEffect`)로 맞추지 않는다 — 렌더 중에 계산되면 어긋난 상태가 **한 프레임도** 존재하지
않는다. 필터를 바꾸면 `log` 파라미터도 함께 버린다.

**기록 번호는 서버가 붙인다.** 원본은 `log_88410 + 줄번호 × 17` 로 만들어서, 필터를 걸면
같은 기록이 다른 번호를 갖는다 — 감사 기록에서 번호가 흔들리면 그걸로 서로 가리킬 수가 없다.

필터와 선택은 전부 URL 에 있다(§18.6). 「이 기록 좀 봐 달라」 를 **링크로 보낼 수 있어야**
감사 로그가 쓸모 있다.

### 32.7 표의 기준 폭은 「열을 다 보여 주는 데 필요한 폭」이다

원본을 따라 `flex: 3 1 560px` 로 뒀더니, 좁은 화면에서 표가 옆 패널과 나란히 서려다 눌려
**「사유」 열이 스크롤 밖으로 나갔다** — 목록에서 제일 많이 읽는 열이다.

측정: 컨테이너 714px · 표 1160px · **넘침 446px.**

기준 폭을 표가 실제로 필요한 **920px**(고정 폭 열의 합)로 올렸다. 자리가 모자라면 패널이
아래로 내려가고 표는 온전히 보인다. 고친 뒤: 컨테이너 1104 · 표 1104 · **넘침 0.**

> `minWidth` 도 1160 → 920 으로 내렸다. **열 폭의 합보다 크게 잡으면 필요 없는 가로
> 스크롤이 생긴다** — 「넉넉하게」 는 합보다 조금 큰 것이지 아무 값이나 큰 것이 아니다.


---

## 33. 폼 초안 — 새로고침을 견디게

keep-alive 는 탭을 옮겨도 화면을 살려 두지만 **새로고침은 못 견딘다**(§6.3). 폼 화면에서
그건 「쓰던 걸 통째로 잃는다」 는 뜻이고, `beforeunload` 는 **브라우저 기본 문구밖에 못
띄운다**(§13) — 막을 수 있는 건 실수로 닫는 것뿐이고, 이미 닫힌 뒤에는 할 수 있는 게 없다.

아이템 폼에만 있던 것을 **폼 화면 일곱 곳으로** 올렸다.

| | |
|---|---|
| `shared/lib/draft.ts` | 순수 — 칸 이름 · 모양 검사 · 직렬화. node 에서 그냥 돌아 테스트가 붙는다 |
| `shared/hooks/useFormDraft.ts` | React 필요 — 자동 저장 타이머 |
| `shared/ui/DraftNotice.tsx` | 「불러왔습니다」 알림과 「임시 저장됨」 |

`lib` 과 `hooks` 를 가른 기준은 **React 가 필요한가**다. `domain/` 이 React 를 안 쓰는 것과
같은 이유로, 순수한 쪽에만 단위 테스트가 붙는다.

### 33.1 ⚠️ 모양이 안 맞는 초안은 조용히 버린다

`sessionStorage` 는 사용자가 직접 고칠 수 있고, **우리가 입력 타입을 바꾸면 예전 초안이
남아 있다.** 믿고 그대로 폼에 넣으면 화면이 깨지거나 — 더 나쁘게 — **`undefined` 인 채로
저장된다**(§18.1 의 `?slot=WING` 과 같은 사고다).

엔티티마다 검사 함수를 손으로 쓰는 대신, **폼이 이미 갖고 있는 `EMPTY` 를 표본으로** 쓴다.

```ts
restoreDraft(DRAFT, EMPTY)              // EMPTY 와 같은 모양이어야 한다
restoreDraft(DRAFT, initial, isKnownSlot)  // 모양으로 못 거르는 값 제약이 있으면
```

`sameShape` 가 보는 것과 못 보는 것:

| | |
|---|---|
| 본다 | 키 집합이 같은가 · 각 자리의 타입 · 중첩 객체 · 배열 원소 · `NaN`/`Infinity` |
| **못 본다** | 열거값(`'HEAD'` 자리의 `'WING'`) → `refine` 으로 넘긴다 |
| **못 본다** | **빈 배열이 표본이면 원소** — 비교할 것이 없다 |

⚠️ **배열과 객체는 `typeof` 가 둘 다 `'object'` 다.** 따로 가르지 않으면 **빈 것끼리는 키
개수까지 같아서 그냥 통과한다** — 칸이 `{}` 에서 `[]` 로 바뀌는 건 실제로 있는 변경이다.

> 이 가드는 처음에 **테스트가 안 잡았다.** `flags: []` 를 넣어 봤는데 키 개수 검사에서
> 먼저 걸려서, 가드를 지워도 초록이었다. `sameShape([], {})` 로 바꾸니 비로소 빨개졌다 —
> **통과하는 테스트는 아무것도 증명하지 않는다.**

### 33.2 ⚠️ 칸 이름에 엔티티를 붙인다

원래 칸 이름은 `riruti_admin_draft:new` 였다. 아이템 폼 하나뿐일 때는 맞았지만, 폼이 일곱
개가 되면 **`/items/new` 와 `/coupons/new` 가 같은 칸을 쓴다.**

```text
쿠폰을 쓰다 말고 → 아이템 등록을 연다 → 아이템 초안이 그 칸을 덮어쓴다
  → 쿠폰으로 돌아오면 없다
```

모양 검사가 있으니 **남의 초안을 폼에 밀어 넣지는 않는다.** 하지만 **덮어쓰는 것은 못
막는다** — 검사는 읽을 때 하고 사고는 쓸 때 난다.

```ts
const draftScope = (itemId?: string): string => `items:${itemId ?? 'new'}`
```

수정 화면은 대상까지 나눈다(`items:3`) — 아이템 3번을 쓰다 만 사람이 5번을 열었을 때 남의
초안을 받으면 안 된다.

### 33.3 되살렸으면 처음부터 「손댔다」다

초안을 초기값으로 넣고 끝내면 폼은 **자기가 깨끗하다고 여긴다.** 그러면 미저장 경고도
자동 저장도 안 돌아서 — **되살려 놓고 다음 새로고침에 또 잃는다.**

- `touched` 를 쓰는 화면은 `useState(restored != null)` 로 시작한다
- react-hook-form 은 `form.reset(restored, { keepDefaultValues: true })` — 기본값은 원본으로
  두고 **값만** 갈아 끼운다

⚠️ **임시 저장은 등록이 아니다.** 초안이 있어도 폼이 더러우면 경고를 켠다 — 초안이 있다고
경고를 끄면 목록으로 나갔다가 「저장했는데 왜 없지」 가 된다.

### 33.4 알림의 표시 여부는 초안과 따로 둔다

`restored` 는 마운트 시점에 고정이라 **「새로 시작」 으로 버려도 계속 참**이다. 그것만 보고
알림을 그리면 지워지지 않는다. `noticeOpen` 을 따로 둔다.

FAQ 편집은 반대 방향으로 같은 문제가 있다 — 거기서는 `draft !== null` 이 곧 더러움이라,
「새로 시작」 뒤에 **한 글자만 쳐도 다시 참**이 된다. 역시 따로 둬야 한다.

### 33.5 자동으로 저장하고, 버튼은 「방금 됐다」를 보여 준다

**「임시 저장」 을 누른 사람만 살아남으면 안 된다.** 잃는 일은 대개 실수로 새로고침할 때
일어나고 그때는 버튼을 누를 기회가 없다. 마지막 타건 뒤 **500ms** 조용하면 쓴다.

⚠️ **`saveNow` 가 값을 의존성으로 갖지 않게 한다**(`useRef` 로 최신 값을 들고 있는다).
값이 바뀔 때마다 함수가 새로 만들어지면 타이머가 매 타건마다 다시 걸려 **조용해질 때까지
기다리는 의미가 사라진다** — 글자마다 쓰게 되고 긴 폼에서 눈에 띄게 버벅인다.

### 33.6 아직 안 붙인 곳

**제자리 편집·순서 바꾸기 화면 다섯**(`ShopDisplayPage` · `FaqPage` · `CodeDetailPage` ·
`SpeciesDetailPage` · `UiKitPage`)에는 안 붙였다. 이쪽은 초안이 「작성 중인 문서」 가 아니라
**「목록을 이만큼 끌어다 놨다」** 라 되살릴 값의 성격이 다르다 — 순서만 남기면 그 사이 목록이
바뀌었을 때 무엇을 되살린 것인지 말하기 어렵다. 붙일 때 그 질문부터 답할 것.

### 33.7 ⚠️ 대상이 바뀌면 폼을 다시 마운트한다

FAQ 편집은 **경로가 하나고 쿼리만 다르다.**

```text
/support/faq/edit            FAQ 등록
/support/faq/edit?id=3       FAQ 3 편집
/support/faq/edit?q=…&a=…    문의에서 넘어온 등록 (InquiryDetailPage)
```

react-router 는 경로가 같으면 **같은 컴포넌트 인스턴스를 그대로 쓴다.** 그러면
`useState` 초기화 함수가 다시 돌지 않아 **3번을 쓰다 만 초안이 다음 화면에 그대로 뜨고,
`useFormDraft` 는 그 값을 새 칸(`faq:5` 또는 `faq:new`)에 쓴다.** 저장을 누르면 3번의
내용이 다른 FAQ 에 들어간다.

⚠️ **이동 가드가 막아 주지 않는다.** `willDiscard` 는 **경로만 비교**해서 `from === to`
면 그냥 통과시킨다(§13) — 같은 서브 메뉴 안의 이동을 막으려고 만든 규칙이라 쿼리는
보지 않는다. **다른 층의 가드에 기대는 안전은 안전이 아니다.**

`ItemFormPage`·`ChallengeFormPage` 가 이미 쓰는 모양으로 갈랐다 — 바깥이 대상을 정하고,
안쪽을 **`key` 로 다시 마운트**한다.

```tsx
return <FaqForm key={faqId} faqId={faqId} initial={initial} />
```

`key` 하나로 초안 · 오류 표시(`tried`) · 알림(`noticeOpen`) 이 **함께** 초기화된다. 덤으로
초기값이 준비된 뒤에만 마운트되므로 `draft ?? loaded ?? prefill` 3단 사슬과 「늦게 온 서버
값이 사용자가 친 글자를 덮어쓴다」 걱정(§27.3)이 통째로 사라진다.

> 브라우저로 끝까지 몰아 보지는 못했다 — 화면을 벗어나는 경로마다 이동 가드가 먼저 막아서,
> 쿼리만 바뀌는 전환을 UI 로 만들지 못했다. **고친 이유는 재현이 아니라 `willDiscard` 가
> 쿼리를 안 본다는 사실**이고, 그건 코드로 확인했다.

### 33.8 ⚠️ 「더럽다」 는 판정이 두 개면 반드시 어긋난다

푸시 화면은 이동 가드에 `title !== '' || body !== ''` 를, 자동 저장에 `changed(form, EMPTY)`
를 주고 있었다. **대상 · 예약 시각 · 링크만 고친 사람은 초안은 남는데 경고는 안 뜬다.**

`CodeFormPage` 에 이미 같은 규약이 주석으로 있었다 — 「폼 전체를 본다. 이름·키만 보면
설명·분류·값만 채운 사람이 경고 없이 잃는다」. 푸시만 좁은 채로 남아 있었고, 초안을 붙이면서
**두 판정이 서로 다른 답을 내는 상태**가 됐다.

한 함수(`changed`)를 둘이 함께 쓴다. **판정이 하나면 어긋날 자리가 없다.**


---

## 34. 시즌

시즌은 헤더 · 지표 · 아이템 · 종 네 화면에 나오는데, **네 곳이 각자 정의하고 서로 달랐다.**

### 34.1 ⚠️ 같은 목록이 네 벌 있었다

| 곳 | 갖고 있던 것 |
|---|---|
| `Topbar` | `시즌 3 · D-12` **문자열** — D-12 가 줄지 않는다 |
| `DashboardPage` | `"시즌 3 · 최근 14일…"` 문자열 |
| `ItemFormPage` | `['상시', '시즌 2', '시즌 3', '시즌 4']` — **시즌 1 이 없다** |
| `domain/species` | `['상시', '시즌 1', '시즌 2', '시즌 3']` — **시즌 4 가 없다** |

아이템과 종이 **서로 다른 목록**을 보고 있었다. 그래서:

- **시즌 1 아이템을 수정하려고 열면** 그 시즌이 목록에 없어 셀렉트가 값을 못 잡고,
  고치지도 않은 칸이 저장하는 순간 다른 값으로 바뀐다
- **시즌 4 종은 만들 수 없다** — 다음 시즌 콘텐츠를 미리 만드는 게 시즌제의 운영 방식인데도

공통 코드의 `SEASON` 그룹은 자기 「쓰는 곳」 에 `itemnew` 를 적어 두고도 **아무도 그걸
보지 않았다.** 목록을 관리한다고 적힌 화면과 실제로 쓰이는 목록이 달랐다.

`domain/season.ts` 하나로 합쳤다. 고를 수 있는 시즌은 **`상시` + 시즌 1..현재+1** 이다.

### 34.2 ⚠️ 시즌 목록은 타입이 아니라 값이다

원래 종 도메인은 이랬다.

```ts
export const SEASONS = ['상시', '시즌 1', '시즌 2', '시즌 3'] as const
export type Season = (typeof SEASONS)[number]
```

유니온 타입이라 안전해 보이지만, **고를 수 있는 시즌은 지금 시즌에 따라 바뀌는 값**이다.
타입으로 굳히면 **시즌이 넘어갈 때마다 코드를 고쳐야 하고**, 실제로 그래서 네 곳이 서로
다른 목록을 들고 있었다 — 고쳐야 할 곳이 넷인데 하나씩 잊은 것이다.

필드를 `string` 으로 두고 **아는 값인지는 `validateSpecies` 가 본다.** 컴파일 타임 안전을
하나 잃는 대신, 시즌이 넘어갈 때 고칠 곳이 **상수 하나**가 된다.

> 타입 이름도 겹쳤다(`domain/season.ts` 의 `Season` = 시즌 자체, 종의 `Season` = 시즌 이름).
> 뒤엣것을 `SpeciesSeason` 으로 바꿨다 — 같은 이름이 다른 것을 가리키면 어느 쪽을
> import 했는지가 사고의 원인이 된다.

### 34.3 ⚠️ 경계는 「마지막 날」이지 「끝나는 날」이 아니다

`endsAt` 은 **그 날까지 한다**는 뜻이다. 배타로 읽으면 마지막 날에 **하루 일찍 「종료」** 가
떠서, 그날 마감을 노리던 이벤트가 닫힌 것처럼 보인다. 되돌릴 수 없는 하루다.

```text
2026-09-11  시즌 3 · D-1
2026-09-12  시즌 3 · 오늘 마감     ← 아직 하는 중이다
2026-09-13  시즌 3 · 종료
```

**`D-0` 대신 「오늘 마감」 이라고 쓴다.** `D-0` 은 「끝났다」 로도 「오늘까지」 로도 읽혀서,
하필 제일 중요한 날에 제일 헷갈린다. 시작 전도 `D+n` 이 아니라 **「n일 뒤 시작」** 이다 —
남은 날과 기다리는 날은 다른 값이라 같은 모양으로 쓰면 카운트다운이 거꾸로 읽힌다.

### 34.4 목 날짜를 오늘에 붙이지 않았다

다른 목 데이터는 `daysAgo()` 로 오늘에 붙인다(§21.3). **시즌만 고정 날짜로 뒀다.**

오늘에 붙이면 숫자는 안 죽지만 **영원히 `D-12`** 라, 문자열로 박혀 있던 것과 화면에서
구별되지 않는다 — **고친 것이 고쳐졌는지 볼 수 없다.** 원본의 `D-12` 와 맞도록 마감을
잡되(90일 시즌, 2026-06-14 ~ 09-12) 고정해서, 하루 지날 때마다 실제로 줄고 지나면
「종료」 가 뜨게 했다.

> 그래서 마감이 지난 뒤 데모를 열면 헤더가 「시즌 3 · 종료」 라고 말한다. **그게 맞는
> 표시다** — 서버가 시즌을 주기 시작하면 상수 한 줄만 바뀐다.

### 34.5 ⚠️ 판별하지 못하는 테스트를 판별한다고 적지 않는다

`daysBetween` 의 서머타임 테스트는 **Asia/Seoul 에서 아무것도 증명하지 못한다.** 서머타임이
없어서 UTC 로 재든 실행 환경 시간대로 재든 답이 같다 — `Date.UTC` 를 지역 파싱으로 바꿔
넣어도 초록이었다.

**기존 `shiftDays` 의 서머타임 테스트도 같았다.** 문서에 「`America/New_York` 에서 하루를
건너뛰었다」 고 적혀 있는데, `setDate` 구현을 되돌려 넣고 `TZ=America/New_York` 으로 돌려도
통과한다. 있는 줄 알았던 그물이 없다.

지우지 않고 **제목에 「서머타임 지역에서만 판별된다」 를 적었다.** 의도를 남기는 자리이고,
CI 를 그런 시간대에서 돌리면 비로소 일한다.

같은 검사에서 `Math.round` 도 뺐다 — UTC 자정끼리의 차는 **정확히 86,400,000 의 배수**라
반올림할 것이 없다. **막을 것이 없는데 막는 모양으로 서 있으면**, 다음 사람이 그게 무언가를
지켜 준다고 믿는다.

TODO(서머타임 있는 시간대로 CI 를 돌리게 되면): 이 두 테스트가 실제로 그물이 된다.

### 34.6 ⚠️ 잠긴 버튼은 이유를 말해야 한다

`validateSpecies` 에 시즌 검사를 더하면서 **오류를 화면에 붙이지 않았다.** `blocked` 에는
들어가니 「등록」 은 잠기는데, 셀렉트 옆에도 체크리스트에도 아무 말이 없다 — **왜 안 되는지
모른 채 잠긴 버튼만 보인다.**

도달 경로는 초안이다(§33.1). `sameShape` 는 **열거값을 못 본다** — 예전에 저장해 둔 초안이나
손으로 고친 값이 목록 밖의 시즌을 들고 복원되면 정확히 이 상태가 된다.

측정: `species:new` 초안에 `season: '시즌 9'` 를 심고 열었다.

```text
「임시 저장된 내용을 불러왔습니다」
시즌 한정 셀렉트 아래   ⓘ 없는 시즌입니다.
체크리스트            ○ 없는 시즌입니다.
등록 버튼             잠김
```

**검증을 더할 때는 그 오류가 나갈 자리도 함께 만든다.** 규칙만 더하면 화면은 조용히
막히기만 한다.

### 34.7 ⚠️ 테스트에 시즌 이름을 손으로 적지 않는다

종 테스트가 `'시즌 3'`(지금 시즌)과 `'시즌 9'`(없는 시즌)를 문자열로 들고 있었다. **`CURRENT_SEASON`
이 넘어가면 둘 다 뜻이 바뀐다** — `'시즌 3'` 은 지금 시즌이 아니게 되고, `'시즌 9'` 는
시즌 8 부터 **유효해진다.**

그때 테스트는 빨개지는 게 아니라 **엉뚱한 것을 재기 시작한다.** 네 곳이 어긋났던 것과
정확히 같은 사고를 테스트 안에서 되풀이한 셈이다.

```ts
const NOW = seasonLabel(CURRENT_SEASON.no)
const FIRST = seasonLabel(1)
const NEXT = seasonLabel(CURRENT_SEASON.no + 1)
/** 목록은 다음 시즌까지다. 그 하나 너머는 언제나 밖이다 */
const BEYOND = seasonLabel(CURRENT_SEASON.no + 2)
```

확인: 상수를 `no: 9` 로 올려 보면 **손으로 적은 쪽은 1건 빨개지고, 지금 것은 그대로 초록**이다.

### 34.8 ⚠️ 셀렉트는 목록 밖의 값을 조용히 지운다

§34.6 을 고치고 나서도 화면은 **절반만 말하고 있었다.**

```text
시즌 한정  [            ▾]   ← 비어 있다
           ⓘ 없는 시즌입니다.
```

`Select` 는 `options` 에 없는 `value` 의 **라벨을 그릴 수 없어 빈 칸**이 된다. 「없는 시즌입니다」
라고 써 붙여 놓고 **정작 무엇이 잘못됐는지는 안 보여 주는** 셈이다 — 운영자는 「아직 안
골랐나 보다」 로 읽고, 고칠 대상을 못 본다.

`seasonOptions(season, current?)` 가 **지금 값이 목록에 없으면 뒤에 붙인다.** 이미 있으면
두 번 넣지 않고, 빈 값은 붙이지 않는다(빈 값은 「아직 안 골랐다」 이지 고를 수 있는 시즌이
아니다).

**아이템 폼도 같이 고쳤다.** 리뷰는 종 화면만 짚었지만 구멍은 `Select` 를 쓰는 쪽 전부에
있다 — 아이템은 선택지를 모듈 상수로 만들고 있어서 지금 값을 볼 수 없었고, 렌더 안으로
옮겼다. **한 곳만 고치면 다음에 같은 걸 또 찾게 된다.**

> 값 목록을 좁히는 화면은 전부 이 함정을 갖는다. 「고를 수 있는 것」 과 「지금 들어 있는 것」
> 은 다른 집합이고, 셀렉트는 **둘의 합집합**을 받아야 한다.


---

## 35. `Column` 은 판별 유니온이다

§31.13 에서 미룬 것을 마무리했다. `Column` 의 `key` 가 `string` 이라 **행에 없는 필드를
적어도 타입이 아무 말을 하지 않았고**, 꺼낼 때 캐스팅해서 **빈 칸**이 나왔다.
관리자 목록의 「최근 접속」 이 실제로 그렇게 비었다.

### 35.1 열은 두 종류다

```ts
export type Column<Row> = ColumnStyle &
  ({ key: string; render: (row: Row) => ReactNode } | { key: FieldKey<Row>; render?: never })
```

| | `key` 의 뜻 |
|---|---|
| `render` 있음 | **React 키일 뿐**이다. 값은 `render` 가 만든다 — 아무 문자열이어도 된다 |
| `render` 없음 | **행에서 꺼낼 필드 이름**이라 실재해야 한다 |

`render?: never` 가 판별자다. 이게 없으면 「필드 이름 + render 없음」 을 첫 가지가
받아 버려 좁혀지지 않는다.

### 35.2 ⚠️ `ReactNode` 로 좁히면 부족하다

처음엔 `Row[K] extends ReactNode` 로 썼는데, **`ReactNode` 에는 `boolean` 이 들어 있고
React 는 `true`/`false` 를 아무것도 그리지 않는다** — 타입은 통과하는데 칸은 비는,
고치려던 바로 그 모양이다. 객체·배열·함수도 같은 이유로 뺀다.

```ts
type FieldKey<Row> = {
  [K in keyof Row]-?: K extends string
    ? NonNullable<Row[K]> extends string | number ? K : never
    : never
}[keyof Row]
```

`null`·`undefined` 는 **허용한다** — 「값이 없다」 를 빈 칸으로 그리는 것은 의도된 표시라,
`at?: string` 같은 열을 막으면 안 된다.

⚠️ **`any` 는 따로 막아야 한다.** `any` 는 조건부 타입에서 **양쪽 가지로 분배돼**
`any extends string | number` 가 참이자 거짓이라, 위 검사를 그냥 통과한다. 실제로 들어
있는 값이 `boolean` 이면 **똑같이 빈 칸**이 된다.

```ts
/** `1 & any` 가 `any` 라서 `0` 이 거기 들어간다 — `T` 가 `any` 일 때만 참이다 */
type IsAny<T> = 0 extends 1 & T ? true : false
```

> `no-explicit-any` 가 **손으로 적는 길은 이미 막고 있다**(저장소에 `any` 는 0건이다).
> 남는 경로는 **타입 없는 의존성에서 새어 들어오는 것**뿐이라 눈에 안 띈다 — 그래서
> 더 막아야 한다. 시험하려면 `any` 가 필요해서 타입 테스트에서만 규칙을 끄고, 그 이유를
> 그 자리에 적었다. **보증에 예외를 하나 남기면 그 예외가 다음 사고의 자리가 된다.**

### 35.3 검사기는 `typecheck` 다

`Table.types.test.ts` 는 런타임에 아무것도 하지 않는다. **`@ts-expect-error` 는 오류가
나지 않으면 그 자체로 오류**라, 타입이 헐거워지는 순간 `bun run typecheck` 이 깨진다.

확인: `key: FieldKey<Row>` 를 `key: string` 으로 되돌리면 **`Unused '@ts-expect-error'`
3건**이 뜬다. `vitest` 로는 못 잡는 종류라 검사 자리가 다르다.

> ESLint 가 `@ts-expect-error` 에 이유를 요구한다(`ban-ts-comment`). 지시어 뒤에 붙인다 —
> 억누르는 이유가 안 적힌 억제는 다음 사람이 지워도 되는지 알 수 없다.

**기존 위반은 0건이었다.** 「최근 접속」 이 유일했고 그때 고쳤다 — 이 절은 **다시 나지
않게 하는 것**이지 새 버그를 고친 것이 아니다.

### 35.4 미결 — `rowKey` 없는 표가 20개다

`rowKey` 를 안 주면 React 키가 배열 인덱스가 된다. 문서에는 「정렬·필터에서 어긋난다」 고
적혀 있는데, **지금 눈에 보이는 고장은 찾지 못했다** — 셀이 전부 무상태 렌더라 인덱스
키로도 화면이 맞는다.

필수로 바꾸면 20곳을 건드려야 하는데 **깨지는 것을 보여 줄 수 없어 하지 않았다.**
셀 안에 입력이나 애니메이션이 생기면 그때 실제로 깨지고, 그게 바꿀 근거다.

TODO(표 셀에 상태가 생기면): `rowKey` 를 필수로 올린다.


---

## 36. 커맨드 팔레트 (⌘K)

원본의 헤더 검색창은 `<span>` 이라 입력이 안 됐고, **가짜 입력창은 지웠다**(§9) —
「어드민에서 눌러도 안 되는 검색창은 *이 도구는 고장났다* 를 학습시킨다. 만들 때
진짜로 붙인다」. 이제 붙였다.

사이드바가 15그룹이고 열 수 있는 화면이 36개다. **「어디 있더라」 를 없애는 것**이
이 물건의 일이고, 특히 「아이템 등록」·「쿠폰 발급」·「관리자 초대」 처럼 **사이드바에
없어 목록을 거쳐야만 닿는 화면**이 그렇다.

### 36.1 ⚠️ 데이터는 찾지 않는다

아이템·회원까지 찾으려면 **엔티티를 가로지르는 검색 엔드포인트**가 있어야 하는데 없다.
목으로 흉내 내면 **지워 버린 가짜 검색창을 되풀이하는 것**이다 — 그때는 눌러도 아무 일이
없었고, 이번에는 진짜 서버에서 안 나오는 결과가 나온다. 더 나쁘다.

찾는 것은 **화면뿐**이고, 안내 문구도 「화면 이름으로 이동」 이라고 적어 범위를 밝힌다.
서버가 생기면 `domain/palette.ts` 에 두 번째 종류를 더한다.

### 36.2 초성으로 찾는다

화면 이름이 대부분 두세 글자라, **「감사」 를 다 치는 것과 「ㄱㅅ」 을 치는 것의 차이가 곧
팔레트를 쓰느냐 마느냐**가 된다. `shared/lib/hangul.ts` 가 음절을 초성으로 바꾼다.

⚠️ **한글이 아닌 글자를 버리지 않는다.** 「FAQ 편집」 을 `ㅍㅈ` 으로만 만들면 `FAQ` 로는
못 찾는다 — 초성 검색은 **덧붙이는 길**이지 대체하는 길이 아니다.

⚠️ **모음이 섞이면 초성 검색이 아니다**(`isChosungQuery`). 「감사」 까지 치고 나면 초성으로
볼 이유가 없고, 그때는 보통 검색이 더 정확하다.

**공백은 양쪽 다 지운다.** 「아이템목록」 으로도 「아이템 목록」 으로도 찾혀야 한다 —
검색어에 공백이 있는 쪽이 오히려 흔하다.

### 36.3 ⚠️ 못 여는 화면과 권한 밖 화면은 목록에 없다

| | 왜 |
|---|---|
| `/items/:itemId` 처럼 **파라미터가 있는 경로** | id 없이는 열 수 없다. 두면 눌렀을 때 `:itemId` 라는 글자 그대로의 주소로 간다 |
| **권한 밖 화면** | 보여 주고 막으면 운영자가 **있는 줄도 몰랐던 화면의 존재**를 알게 되고, 눌러도 튕겨서 고장으로 읽힌다 |

측정: 운영자(캐릭터·배경·레벨)로 열면 8개만 나오고, 「관리자」 를 쳐도 **「찾는 화면이
없습니다」** 다.

**그룹 이름은 `section` 을 따라가 찾는다.** 「아이템 등록」 은 사이드바에 없지만
`section: 'items'` 라 「아이템」 그룹을 붙일 수 있다. 그래도 없으면(내 계정 보안) **비워
둔다** — 없는 그룹을 지어내지 않는다.

### 36.4 ⚠️ 고른 자리가 목록 밖으로 나가지 않게 한다

글자를 지우면 목록이 늘고 치면 줄어드는데, 자리를 그대로 두면 Enter 가 **아무것도 아닌
것**을 연다. 렌더 때 `Math.min` 으로 눌러 둔다 — 효과로 맞추면 어긋난 상태가 한 프레임
존재한다.

### 36.5 ⚠️ 멈춰 있는 마우스가 키보드 선택을 훔친다

**브라우저로 시험하다 실제로 났다.** 「ㄱㅅ」 을 치고 Enter 를 눌렀더니 강조돼 있던
「감사 로그」 가 아니라 **「FAQ 편집」** 이 열렸다.

```text
목록이 8개 → 4개로 줄면 창이 짧아지고,
멈춰 있는 커서 밑으로 다른 항목이 미끄러져 들어온다
  → 브라우저가 그때도 mousemove 를 쏜다
  → onMouseMove 가 선택을 그리로 옮긴다
```

**자리가 실제로 바뀐 움직임만** 선택을 옮긴다(마지막 포인터 좌표와 비교). 키보드로 고르는
중에 마우스가 끼어들지 않는다.

> 단위 테스트로는 못 잡는 종류다 — 도메인은 옳았고 깨진 것은 **레이아웃과 포인터의
> 상호작용**이었다. 화면을 실제로 두드려 봐야 나온다.

### 36.6 여닫기

**마운트가 곧 「열림」 이다.** `Dialog` 와 달리 `open` prop 이 없고 부모가 열릴 때만
렌더한다 — 「열 때마다 처음부터」 를 마운트로 표현하면 검색어·커서를 effect 에서 되돌릴
일이 없다. effect 안의 `setState` 는 렌더를 한 번 더 돌리고, ESLint 도 그걸 막는다.

⚠️ **단축키는 `e.code` 로 본다.** `e.key` 는 IME 조합 중에 `Process` 가 되어, **한글을
치다 ⌘K 를 누르면 안 열린다.**

⚠️ **`preventDefault` 가 필수다.** 크롬에서 ⌘K 는 주소창 검색 단축키라, 막지 않으면
팔레트가 열리는 동시에 **포커스가 주소창으로 빠진다.**

⚠️ **`metaKey` 와 `ctrlKey` 를 둘 다 본다.** 한쪽만 보면 절반의 운영자에게는 없는 기능이다.
**표시도 같이 갈라야 한다** — 받기는 둘 다 받으면서 `⌘K` 만 보여 주면 윈도 운영자에게는
여전히 없는 기능이다. 감사 로그에 `Chrome · Windows` 가 찍히는 팀이다.

### 36.7 ⚠️ 한글을 조합하는 중에는 키를 가로채지 않는다

「감사」 를 치면 마지막 글자가 **조합 중**이고, 그것을 확정하는 것도 Enter 다. 우리가 그
Enter 를 가로채면 **글자가 완성되기도 전에 화면이 바뀐다** — 한국어 어드민에서 매번 밟는다.

측정(가드를 빼고 조합 중 Enter 를 쏘면):

```text
가드 없이   /dashboard → /audit     ← 확정하려던 Enter 가 화면을 넘긴다
가드 두고   /dashboard → /dashboard  ← 팔레트가 열린 채 그대로
```

React 는 `e.nativeEvent.isComposing` 으로 알려 준다. **위·아래 화살표도 함께 막는다** —
조합 중의 화살표는 IME 의 후보 이동일 수 있다.

### 36.8 창 자체에도 이름이 필요하다

`<dialog>` 에 `aria-label` 이 없으면 스크린리더가 **「대화상자」 라고만 읽고 무슨
대화상자인지는 말하지 않는다.** 안의 입력에 이름을 줘도 그건 입력의 이름이지 창의 이름이
아니다.

> ⚠️ **`showModal()` 중복 호출은 막지 않았다.** 이미 **모달로** 열린 dialog 에 다시 부르면
> 아무 일도 없다 — 던지는 것은 `show()` 로 **비모달**로 열어 둔 뒤에 부를 때다. 재 봤다:
>
> ```text
> 이미 모달인데 showModal()   안 던짐
> show() 뒤 showModal()       InvalidStateError
> ```
>
> 이 팔레트는 `show()` 를 부르는 곳이 없다. **막을 것이 없는데 막는 모양으로 서 있으면**
> 다음 사람이 그게 무언가를 지켜 준다고 믿는다(§34.5 와 같은 이유).
## 37. ⚠️ 보이는 글자가 접근 이름 안에 있어야 한다

Lighthouse 접근성은 세 화면에서 **100 인데 `label-content-name-mismatch` 가 떠 있었다.**
그 검사는 가중치가 0 이라 점수를 안 깎는다 — **100 이 출발선이지 결승선이 아니라는 말이
숫자로 나온 자리**다(§9.4).

```text
100  /coupons/new       ✗ label-content-name-mismatch
100  /items/new         ✗ label-content-name-mismatch
100  /support/faq/edit  ✗ label-content-name-mismatch
```

셋 다 원인은 하나, `shared/ui/Switch` 였다.

```text
버튼 안의 글자   「1인 1회 제한 · 같은 계정이 두 번 사용할 수 없습니다」
접근 이름        「1인 1회 제한」                    ← aria-label 로 못박아 둔 것
```

라벨과 힌트가 **둘 다 버튼 안**에 있어서, 그냥 두면 이름이 둘을 이어 붙인 것이 된다.
그래서 `aria-label` 로 이름을 라벨에 못박아 뒀는데, 이번엔 **보이는 글자가 이름보다 길어졌다.**

**화면을 보고 말하는 사람에게 이게 곧 고장이다** — 음성 제어는 보이는 글자를 그대로 부르는데,
그 글자가 이름 안에 없으면 안 잡힌다.

### 37.1 이름을 고치지 말고 버튼을 좁힌다

힌트를 **버튼 밖으로** 뺐다. 그러면 버튼 안의 글자가 라벨뿐이라 **그 글자가 곧 이름**이고,
`aria-label` 자체가 필요 없다 — 둘이 갈라질 자리가 사라진다.

```text
<span>                              ← 감싸는 것
  <button role="switch">            ← 트랙 + 라벨. 보이는 글자 = 접근 이름
  <span id=hint>                    ← 밖. aria-describedby 로만 이어진다
```

- `aria-label` 은 **라벨을 감출 때만**(`labelHidden`) 준다. 그때는 보이는 글자가 없어 어긋날
  수 없다
- 힌트는 **라벨 아래로 들여쓴다**(트랙 38 + 간격 10 = 48px). 안 그러면 트랙 왼쪽까지 나와서
  무엇에 붙은 설명인지 안 보인다
- 힌트를 눌러도 이제 토글되지 않는다. **설명은 컨트롤이 아니다** — 잃은 것보다 얻은 것이 크다

### 37.2 점수만 보면 못 찾는다

이 결함은 **네 달 동안 화면에 있었다.** 스위치를 쓰는 화면마다 Lighthouse 를 100 으로
확인했고, 그때마다 이 검사는 「실패」 인 채로 목록에 있었다 — 점수만 읽었기 때문이다.

TODO(다음에 Lighthouse 를 돌릴 때): 점수뿐 아니라 **`score < 1` 인 검사 id 를 함께 찍는다.**
가중치 0 짜리가 거기 숨는다.

### 37.3 ⚠️ 라벨을 감추면 힌트를 줄 수 없다

`labelHidden` 은 「라벨만 화면에서 숨긴다」 고 적혀 있었는데, 실제로는 **힌트 렌더링과
`aria-describedby` 까지 함께 지우고 있었다.** 문서와 동작이 갈라진 자리다.

동작 쪽이 맞다 — **힌트는 라벨에 붙는 설명**이라, 라벨이 없으면 무엇을 설명하는지 없는
글자가 된다. 표 한 줄에 설명만 덩그러니 놓이는 모양이다.

**주석으로 적어 두는 대신 타입으로 막았다.**

```ts
type SwitchProps = SwitchBase &
  ({ labelHidden?: false; hint?: string } | { labelHidden: true; hint?: never })
```

`Switch.types.test.ts` 가 `@ts-expect-error` 로 고정한다 — `hint?: never` 를 `hint?: string`
으로 되돌리면 **`Unused '@ts-expect-error'`** 로 `typecheck` 이 깨진다. `Column`(§35.3)과
같은 방식이고, 같은 이유다: **주석은 규칙의 제일 약한 형태다.**


---

## 38. 접근성은 점수가 아니라 검사 목록으로 본다

§37 에서 **점수 100 인데 실패한 검사가 있는** 것을 처음 봤다. 그 뒤 구현된 화면 32개를
전부 훑었더니 **하나 더** 나왔다.

```text
100  /moderation/ai   ✗ td-has-header
```

둘 다 **가중치가 0** 이라 점수를 깎지 않는다. 손으로 화면마다 100 을 확인하던 몇 달 동안
목록에는 계속 「실패」 로 있었고, 아무도 안 봤다.

### 38.1 ⚠️ 빈 `<th>` 는 헤더가 아니다

`/moderation/ai` 의 마지막 열은 「보기」 버튼만 있어서 제목을 `label: ''` 로 비워 뒀다.
빈 `<th>` 는 헤더로 안 쳐져서 **그 열의 칸들이 헤더를 잃는다** — 스크린리더가 몇 번째
칸인지만 읽고 무엇인지는 말하지 못한다.

`Column.labelHidden` 을 더했다. **글자는 DOM 에 남기고 화면에서만 감춘다**(`srOnly`) —
안 그리면 다시 빈 `<th>` 가 된다.

```tsx
{ key: 'open', label: '열람', labelHidden: true, … }
```

`Switch.labelHidden`(§27.2)과 같은 이름을 쓴다 — 같은 뜻이면 같은 말로 부른다.

> 빈 라벨을 쓰던 곳은 **저장소 전체에 이 한 곳뿐**이었다. 다른 표들이 안 걸린 이유다.

### 38.2 `bun run a11y` — 되풀이할 수 있게

§37.2 에 「다음에 돌릴 때 실패 검사 id 도 찍자」 고 적어 뒀는데, **문서에만 있는 규칙은
새어 나간다**(§17). 스크립트로 만들었다.

```bash
bun run dev            # 먼저 띄워 둔다
bun run a11y           # 구현된 화면 전부
bun run a11y /items    # 골라서
```

- **점수와 실패 검사 id 를 함께** 찍고, 하나라도 있으면 **종료 코드 1**
- 화면 목록은 `screens.ts` + `router.tsx` 에서 뽑는다 — 새 화면이 자동으로 대상이 된다
- **파라미터 경로와 미구현 화면은 뺀다** — 전자는 열 수 없고, 후자는 placeholder 라 언제나 100 이다
- 목 세션을 심어 **최고 관리자로** 잰다. 운영자로 재면 권한 밖 화면이 리다이렉트돼서
  **엉뚱한 화면을 100 점이라고 보고한다**

⚠️ **`bun run lint` 에 넣지 않았다.** 서버와 크롬이 떠 있어야 하고 화면 하나에 몇 초가
걸린다 — 매 커밋에 물리면 사람이 검사를 끄게 된다. **화면을 새로 만들면 돌린다**(§9.4).

⚠️ **크롬 경로를 주지 않는다.** `chrome-launcher` 가 macOS · Linux · Windows 를 스스로 찾고
`CHROME_PATH` 도 직접 본다. 맥 경로를 넘기면 **그 탐색을 통째로 가려서** 크롬이 깔린
윈도에서도 실패한다 — 라이브러리가 이미 하는 일을 다시 하면 **그 라이브러리보다 못하게**
된다.

확인: `label: ''` 을 되돌려 넣으면 `✗ td-has-header` 와 함께 **종료 코드 1** 이 난다.

> ⚠️ `puppeteer-core` 는 **lighthouse 가 쓰는 버전에 맞춰 고정**한다. 안 맞추면 두 벌이
> 설치돼 `Page` 타입이 갈리고 `typecheck` 이 깨진다 — 캐스팅으로 덮을 자리가 아니다.

### 38.3 도구의 의존성을 모두의 설치에 얹지 않는다

Lighthouse 와 크롬 조종기는 **190 패키지가 넘는다.** 화면을 만들 때만 쓰는 도구를
`devDependencies` 에 넣으면 **아무 것도 안 하는 사람의 `bun install` 까지 무거워진다.**

`scripts/a11y/` 를 **의존성을 따로 갖는 미니 프로젝트**로 갈랐다.

```text
scripts/a11y/package.json   ← lighthouse · chrome-launcher · puppeteer-core
scripts/a11y/check.ts
scripts/a11y/node_modules   ← gitignore. `bun run a11y` 가 처음 돌 때만 생긴다
```

`bun run a11y` 가 `bun install --cwd scripts/a11y --silent` 를 먼저 돌린다. 루트에
`workspaces` 가 없어서 **루트 설치는 이쪽을 쳐다보지 않는다.**

> **순수한 `bunx` 로는 안 된다.** `bunx` 는 패키지의 실행 파일을 돌리는 것이고,
> Lighthouse CLI 에는 **목 세션을 심을 방법이 없다**(`--extra-headers` 로는 `localStorage`
> 를 못 넣는다) — 인증 뒤 화면을 하나도 못 잰다. 그래서 스크립트가 필요하고, 스크립트에는
> 의존성이 필요하다. 갈라 두는 것이 그 둘을 다 만족시키는 자리다.

⚠️ **`tsconfig` 에서 `scripts/a11y` 를 뺀다.** 깨끗한 클론에는 그 `node_modules` 가 없어서
`typecheck` 이 import 를 못 푼다. 대신 그 파일은 타입 검사를 못 받는다 — 도구 하나를
검사 밖에 두는 값으로 모두의 설치 시간을 산 것이다.

⚠️ **`import.meta.url` 을 `fileURLToPath` 로 옮긴다.** 검사 파일은 `scripts/a11y/` 에
있고 읽을 것은 저장소 뿌리에 있어서 두 칸을 거슬러 올라가는데, `URL.pathname` 을 그대로
쓰면 **퍼센트 인코딩이 남는다.**

```text
경로에 공백이 있으면   /Users/me/My%20Drive/repo/   → ENOENT
윈도에서는            /C:/work/repo/                → 열리지 않는다
```

공백 있는 경로에 복사해 재 봤다 — **`pathname` 은 `ENOENT`, `fileURLToPath` 는 읽힌다.**

⚠️ **`check-docs` 가 `node_modules` 를 건너뛰게 했다.** `scripts/` 를 훑는 검사라, 미니
프로젝트를 만든 순간 **남의 코드에서 이름을 주워 와 우리 문서를 남의 시그니처로 판정**하기
시작했다 — `reset` 이 실제로 그렇게 잡혔다. `check-order`·`check-comments` 는 `src/` 만
훑어서 해당이 없다.


---

## 39. 없는 토큰 이름은 조용히 나간다

프로젝트 규약에 **경고로만 적혀 있던 것**이 실제로 났다.

> 스타일 prop 은 토큰 이름을 타입체크하지 않는다. `css({ bg: 'gBg' })` 에서 `gBg` 를
> 지워도 에러 없이 `.bg_gBg{background:gBg}` 라는 잘못된 CSS 가 나간다.

초안 알림 배너(`shared/ui/DraftNotice`)가 `bg: 'warnBg'` 를 쓰고 있었는데, **`warnBg`
라는 토큰은 없다** — `warnFg` 와 `warnBd` 만 있다.

```text
전   .bg_warnBg{background:warnBg}            ← 브라우저가 그 줄을 버린다 → 배경 없음
후   .bg_aBg{background:var(--colors-a-bg)}   → #fdf3e2 · 다크 #33290f
```

**타입도 lint 도 빌드도 아무 말을 하지 않았다.** 테두리(`warnBd`)와 글자(`warnFg`)는
진짜 토큰이라 제대로 나와서, 화면은 「배경만 흰」 배너로 그럴듯하게 보였다.

### 39.1 `check-tokens` — 이름을 실제 토큰과 대조한다

`scripts/check-tokens.ts` 를 `bun run lint` 에 넣었다(이제 여섯 검사).

- **스타일 함수 안에서만** 본다(`css`·`cva`·`sva`·`styled`). 밖에서는 `bg` 가 스코프
  id 이기도 하다 — `domain/admin/labels.ts` 의 `bg: '배경 · 둥지'` 가 그렇다
- 색·`radii`·`fonts` 세 무리를 본다. **축약형(`border`·`boxShadow`)은 안 본다** —
  `1px solid token(colors.bd)` 처럼 값이 섞여 들어와 이름만으로 가릴 수 없다
- 삼항·`??`·`||` 의 **모든 가지**를 본다 (`checked ? 'pri' : 'faint2'`)
- **날값은 막지 않는다** — `#FFFFFF`(QR §12) · `rgba()` · `color-mix()` · `999px` 는
  일부러 토큰을 안 쓰는 자리다
- Panda 의 `!`(important)를 값에서 떼고 본다 — `bg: 'transparent!'` 는 정상이다

주입해서 확인했다.

| 넣은 것 | 결과 |
|---|---|
| 없는 색 · 없는 `radii` · 없는 `fonts` · 삼항의 뒷가지 | **잡힌다** |
| 반응형 객체·배열 안의 오타 · `compoundVariants` 의 `css` | **잡힌다** |
| `transparent!` · `#FFFFFF` · `color-mix(…)` · `999px` | 안 잡힌다(맞다) |
| recipe 의 variant 선택자 · 정상적인 반응형 값 | 안 잡힌다(맞다) |

### 39.2 ⚠️ 검사는 놓쳐도 거짓말해도 안 된다

처음 만든 것에 **구멍 하나와 거짓 양성 하나**가 있었다. 둘 다 지금 코드에는 없는 모양이라
검사는 초록이었는데, **없는 것과 못 잡는 것은 다르다.**

**놓친 것 — 반응형 값.** `bg: { base: 'pri', md: 'nope' }` 와 `bg: ['pri', 'nope']` 는
Panda 의 정상 문법인데, 값을 문자열로만 찾고 있어서 **통째로 새어 나갔다.** 값 안의 객체·배열도
값으로 본다.

**거짓말한 것 — recipe 의 variant 선택자.** `defaultVariants: { color: 'solid' }` 의
`'solid'` 는 **variant 이름**이지 색이 아니다. 그대로 두면 멀쩡한 recipe 가 막히고,
**검사가 거짓말하면 사람이 검사를 끈다.** `defaultVariants` 는 통째로 건너뛰고,
`compoundVariants` 는 **`css` 만** 본다 — 나머지 키는 전부 고르는 조건이다.

> 지금 저장소에는 `color` 라는 이름의 variant 도 반응형 색도 없다. **그래서 더 위험했다** —
> 처음 쓰는 사람이 밟고, 그 사람은 검사를 의심하지 않는다.

> `strictTokens: true`(미결 사항)를 켜면 이것도 잡히지만, **간격까지 전부 토큰화**해야 해서
> 훨씬 큰 일이다. 이 검사는 **문서에 이미 적혀 있던 위험 하나**를 그 결정과 무관하게 막는다.

---

## 40. 업적 (`/achievements`)

원본 `riruti-admin-ach.dc.html` 을 옮긴 화면. **다른 파츠와 반대 원칙**이라 표시 방식부터 다르다 —
원본이 직접 그렇게 말한다.

> 업적은 규격만 공유하고 조형은 전부 다릅니다 — 메달·도장·티켓·우표처럼 저마다 다른 물건으로
> 그려서, 수집함에 늘어놓았을 때 어느 것을 땄는지 **형태만으로** 구분됩니다.

### 40.1 카드와 표는 다른 것을 말한다

같은 12건을 두 번 그리는 게 아니다.

| | 무엇을 | 왜 |
|---|---|---|
| 카드 격자 | 그림 + 이름 + **조형 설명** + 달성률 | 「형태만으로 구분」 이 성립하는지 눈으로 확인하는 자리 |
| 표 | 업적 · 조건 · 보상 · 달성자 · 달성률 | 운영자가 값을 훑고 고치는 자리 |

⚠️ **카드는 누를 수 없다.** 수정으로 가는 길은 표의 행 하나뿐이다 — 같은 것을 여는 통로가 둘이면
어느 쪽이 무엇을 하는지 예측할 수 없다. 원본에서도 카드는 보여 주기만 한다.

⚠️ **뱃지에 타일 배경을 깔지 않는다**(`AssetThumb plate={false}`). 원본이 「배경판 없이 오브젝트
자체로 선다」 고 정한 것이라, 판을 깔면 12종이 한 세트로 보이던 것이 깨진다. `paid` 는 **판의 색**이라
판이 없으면 뜻이 없어서 props 유니온으로 같이 넘기지 못하게 막았다(§8.4, `Switch` 와 같은 방식).

⚠️ **달성률 막대는 `tone="plain"` 이다.** 신호등 색은 「낮으면 손봐야 한다」 는 뜻인데, 업적의 낮은
달성률은 **의도된 희귀도**다 — 「전 업적 달성」 1% 를 주황으로 칠하면 고쳐야 할 문제로 읽힌다.
원본 막대도 단색(`--pFg`)이다. 챌린지 달성률(§21)과 갈리는 지점이다.

### 40.2 `earned` 와 `rate` 를 둘 다 갖는다

중복이 아니다. 전체 유저 수를 화면이 모르므로 실서버도 둘 다 내려준다 — 아이템의 `sold`/`own` 과
같은 모양이다. 원본의 12쌍은 전부 전체 25,170명 기준으로 맞아떨어진다.

목 데이터는 **시드 RNG 를 쓰지 않는다.** 원본에 12건이 통째로 적혀 있어 지어낼 것이 없고,
숫자를 흔들면 디자인 대조가 불가능해진다.

### 40.3 등록·수정은 원본에 없다

원본은 「업적 등록」 버튼만 두고 폼은 그리지 않았다. 아이템 폼(§18.8)을 본으로 삼되 업적에 없는 것
(등급·가격·노출 기간·진열 스위치)은 전부 뺐다 — 남는 것은 **그림과 글 네 칸**이라 카드 하나로 끝난다.

검증에서 필수인 것과 그 이유:

| 칸 | 왜 필수인가 |
|---|---|
| 업적명 | 목록에서 식별할 수 없다 |
| **에셋** | 「형태만으로 구분」 이 이 화면의 전제다. 없으면 목록이 `?` 로 차서 전제가 깨진다 |
| **달성 조건** | 없으면 **영원히 달성되지 않는 업적**이 만들어진다. 등록은 되는데 아무도 못 딴다 |
| 보상 | 표에 열이 있고 「없음」 을 표현할 방법이 없다. 빈 칸은 "보상 없음" 이 아니라 **"아직 안 정함"** 으로 읽힌다 |

조형 설명은 **필수가 아니다** — 카드에 붙을 뿐이라 없어도 화면이 성립한다(아이템의 `sub` 와 같다).

⚠️ **갓 만든 업적은 `earned`·`rate` 가 0 이다.** 아무도 달성하지 않았는데 숫자가 있으면 목록이
거짓말을 한다.

### 40.4 `entities/` 를 이때 만들었다

`AssetPicker` 는 `features/items` 안에 있었는데 업적 폼이 **두 번째 사용처**가 됐다. features 끼리
import 는 ESLint 가 막으므로 올려야 하는데, **`shared/ui` 로는 못 간다** — `AssetKind` 라는 도메인
타입을 받기 때문이고, 그 방향은 `shared ⇄ domain` 순환을 만든다(§4.3 이 실제로 한 번 겪은 사고다).

그래서 `entities/` 를 만들었다. 인벤토리 표에 「아직 없음, 필요해지면 생성」 으로 예고돼 있던 층이다.

```text
app → layouts │ features → entities │ stores │ api → mocks → domain → shared → assets
```

**`entities` 는 `api` 는 부르지만 `stores` 는 못 본다.** 전역 상태를 아는 순간 그 화면 전용이 되어
features 안에 두는 게 맞아진다. `mocks`·`api/core` 도 features 와 같은 이유로 막힌다.
ESLint 로 강제하고 위반 넷을 주입해 실제로 잡히는지 확인했다.

---

## 41. 배경 · 둥지 (`/backgrounds` · `/nests`)

원본 `riruti-admin-bg.dc.html` 을 옮긴 화면 둘. 사이드바에서 한 그룹이지만 **성질이 정반대**라
한쪽만 등록이 있다.

| | 배경 | 둥지 |
|---|---|---|
| 개수 | 20 (무료 16 · 유료 4) | **3 — 기획으로 고정** |
| 등록·수정 | 있다 | **없다** (§41.3) |
| 화면 | 카드 격자만 | 카드 3 + 표 |
| 카드 클릭 | **수정으로** | 없음 |

배경 목록에는 **필터도 검색도 페이지 바도 없다.** 20건이라 한 화면에 다 들어가고 원본에도
없다 — 아이템 목록(§18)과 갈리는 지점이다.

### 41.1 카드가 수정으로 가는 유일한 길이다

업적(§40.1)에서는 카드를 못 누르게 했는데 여기서는 누를 수 있다. **반대로 한 게 아니라 같은
규칙이다** — 「같은 것을 여는 통로는 하나」. 업적에는 표가 있어서 행이 그 통로였고, 배경에는
표가 없어서 카드가 그 통로다.

### 41.2 「무료 해금 / 유료 · 시즌」 은 등급에서 끌어온다

원본은 `i < 16 ? '무료 해금' : '유료 · 시즌'` 로 **목록의 순서**를 보고 정했다. 지금 데이터가
무료 16 + 유료 4 순으로 놓여 있어서만 맞는 식이라, **등록으로 무료 배경이 하나 늘면 그대로
어긋난다.** `backgroundMeta(b)` 가 `b.tier` 에서 끌어온다.

⚠️ **분류(시간·계절·장소·상황)는 엔티티에 없다.** 원본 에셋 표에는 있지만 이 화면 어디에도
표시되지 않는다. 폼에 두면 **아무 데도 나타나지 않는 값**을 운영자가 고르게 되므로 뺐다.
그 정보는 에셋 카탈로그(`mocks/assetTable.ts`)가 들고 있다.

⚠️ **등급은 아이템의 `Tier` 를 그대로 쓴다.** 같은 게임의 같은 「무료/유료」 개념이라 따로
정의하면 라벨이 두 벌이 되고, 한쪽만 바뀌었을 때 화면마다 다른 말을 한다.

⚠️ **무료로 바꾸면 가격도 0 으로 되돌린다.** 값을 남겨 두면 검증이 막는데 가격 칸은 유료일
때만 보이므로, 운영자는 **보이지도 않는 칸 때문에** 저장이 안 된다고 느낀다.

### 41.3 둥지에는 등록이 없다

3단계가 기획으로 고정돼 있다. 4번째를 만들면 **해금 일수 구간이 겹치고**(1–29 / 30–99 / 100~)
클라이언트에 그 연출이 없다. 그래서 `mocks/nests.ts` 에 `upsert` 가 없고 파사드도 읽기 전용이다 —
**빠뜨린 게 아니다.**

같은 이유로 `domain/nest.ts` 는 폴더가 아니라 **파일**이다. 규칙이 하나도 없어서 `rules.ts` 가
빈 파일이 된다 (§4.4 의 「엔티티는 폴더, 횡단 관심사는 파일」 에 대한 예외이자, 그 기준이
개수가 아니라 내용이라는 증거다).

⚠️ **둥지 카드에 가격을 적지 않는다.** 원본은 배경과 카드 생성기를 공유해서 「해금」 배지 옆에
「무료」 가 함께 찍히는데, 둥지는 사고 파는 물건이 아니라 **함께한 일수로 열리는 것**이라 두
라벨이 서로 다른 이야기를 한다. 배지가 이미 「해금」 이라 값은 덜어냈다.

⚠️ **보유율 막대는 `tone="plain"` 이다.** 100일을 함께한 사람이 적은 것은 고칠 문제가 아니라
단계가 깊다는 뜻이다 — 신호등 색을 쓰면 「보금자리 18%」 가 사고로 읽힌다 (§40.1 과 같은 판단).

### 41.4 유료 배경 4종은 그림이 없다

`as_bg_16..19`(은하 · 마법진 · 심해 · 왕좌의 방)는 원화 `루티새v2` 의 `SCENE` 이 16개뿐이라
§8.6 이 뽑지 못했다. **목록과 고르기 창에 `?` 로 뜨는 것이 정상이다.**

목록에서 빼지 않는 이유는, 있어야 **"아직 없다" 를 말할 수 있기** 때문이다. 비슷한 것으로
채우면 나중에 진짜 아트가 왔을 때 무엇이 가짜였는지 알 수 없다.

⚠️ **둥지 그림은 타일 위쪽이 비어 보인다.** 배경 위에 얹히는 오브젝트라 배경과 좌표계가 같고
(`0 0 586 576`) 실제 형상이 아래쪽 1/4 에만 있다 (§8.6 에서 크롭하지 않기로 한 결과다).
원본도 같은 모양이다.
