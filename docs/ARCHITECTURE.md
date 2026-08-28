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

```
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
| `react-hook-form` | `^7.85.0` | 아이템 등록 / 챌린지 등록 / 지급·회수 폼 착수 시 (원본의 `f`, `cf`, `gf` state) |
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

## 4. 폴더 구조

### 4.1 아키텍처 방식

**레이어드 + 기능별 수직 분할.** 수평 레이어(`shared` · `domain` · `stores` · `api`) 위에 화면 단위 수직 슬라이스(`features/*`)를 얹는다. React 진영의 feature-folder 관례(bulletproof-react 계열)에 도메인 층을 하나 더한 형태다.

> **Feature-Sliced Design(FSD)이 아니다.** FSD의 "feature"는 *사용자 행동*이고 6개 층(`app/pages/widgets/features/entities/shared`)을 요구한다. 여기 `features/`는 **화면(page)** 단위고 `widgets` 층이 없다. `domain/`이 FSD의 `entities`에 가장 가깝다.

### 4.2 현재 트리

```
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

```
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

```
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

```
domain/item/           Item 타입 + 규칙        (React 없음)
entities/item/         Item 을 그리는 공용 UI   (React 있음, 도메인 앎)
features/items/        화면
```

의존 방향: `features` → `entities` → `domain` + `shared`

**아직 만들지 않았다.** 구현된 화면이 대시보드 하나뿐이라 두 화면이 공유하는 도메인 컴포넌트가 0개다. §4.4 의 "두 번째 feature 가 쓸 때 올린다"가 그대로 적용된다. 가장 먼저 필요해질 후보는 `StatusBadge`(아이템 목록·상세·상점 진열·대시보드에서 모두 사용).

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

```
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
| 목록 필터 (`slot`/`tier`/`q`/`view`/`page`) | **URL `useSearchParams`** | URL | `state.slot` 등 — **개선점** |
| 폼 입력 (`f`/`cf`/`gf`) | `react-hook-form` (페이지 로컬) | 없음 | `state.f` 등 |
| 상점 진열 순서 | 페이지 로컬 → 저장 시 API | 없음 | `state.shopOrder` |

### 6.2 테마 초기화 — FOUC 방지

zustand persist는 React 마운트 이후에 읽힌다. 그 전에 흰 화면이 번쩍인다.
→ `index.html`의 `<head>`에 **인라인 블로킹 스크립트**로 `data-theme`을 먼저 세팅한다.

```html
<script>try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem('riruti_admin_theme_v1'))?.state?.theme||'light'}catch(e){}</script>
```

### 6.3 탭 스택 규칙 (원본 `pushTab`/`closeTab` 이관)

- 탭 단위는 **화면이 아니라 섹션**(`sectionOf`). 상세로 들어가도 탭이 늘지 않는다.
- 최대 9개. 초과 시 **현재 섹션이 아닌 가장 오래된 탭**을 밀어낸다.
- 활성 탭을 닫으면 마지막 탭으로 이동. 마지막 탭을 닫으면 목록만 비운다.
- 권한 밖(`inScope === false`) 탭은 복원 시 걸러낸다.

---

## 7. 데이터 계층 (목 데이터 유지)

### 7.1 3단 구조

```
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

> **⚠️ 원본이 잘려 있다.** `design/riruti-assets.js`는 정확히 262,144자(256 KiB)에서 끊긴다 — DesignSync `get_file`의 상한이다. 마지막 심볼 `as_face_9`(광대코)가 path 속성 중간에서 잘려 빌드에서 제외된다. **Claude Design에서 원본을 직접 내려받아 `design/`에 덮어쓴 뒤 `bun run assets`를 다시 돌려야 한다.**

### 8.1 원본의 구조

`riruti-assets.js` = `window.RIRUTI_LIB` 문자열. 안에 최상위 `<g id="...">` **61개** + 셸 html에 직접 박힌 `<symbol>` 5개.

| 접두 | 개수 | 내용 |
|---|---|---|
| `ic_*` | 10 (+ 셸 5) | UI 아이콘 — 합쳐서 **15개** |
| `as_head_*` `as_body_*` `as_hand_*` `as_face_*` | 46 | 착용 아이템 |
| `rg` `rgB` `rgE` | 3 | 캐릭터 리그 |
| `nst3b` `nst3f` | 2 | 둥지 앞/뒤 레이어 |

`bg` · `nest` · `growth` · `ach` · `emoji` 에셋은 **이 파일에 없다.** 형제 디자인 파일에 있으므로 해당 화면 착수 시 함께 가져와야 한다.

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
| 개수 / 용량 | 15개 · 64KB | 50개 · 360KB |
| `currentColor` | **29곳에서 사용** | 0 (색이 박혀 있음) |
| 위치 | `src/assets/icons/*.svg` | `src/assets/images/*.svg` |
| 소비 방식 | `?react` (svgr) → **인라인 React 컴포넌트** | URL import → **`<img loading="lazy">`** |
| 이유 | `<img>`로는 CSS `color`가 닿지 않아 테마별 색을 물려받을 수 없다 | 파일 단위 캐시 + 보이는 것만 다운로드 |

```tsx
<Icon name="ic_bird" />                       // 인라인 SVG, color 상속
<AssetThumb assetId="as_head_0" tier="PAID" /> // <img>, 지연 로드
```

**측정된 효과**: 대시보드 최초 로드에서 SVG 요청 **4건 / 22KB**. 예전 스프라이트 방식은 화면에 무엇이 보이든 239KB 덩어리를 통째로 받았다.

빌드는 `assetsInlineLimit`을 SVG에 대해 꺼둔다 — 4KB 미만 파일이 base64로 JS에 녹으면 파일로 뺀 의미가 없다.

`src/assets/{icons,images}/index.ts`는 자동 생성되며 `IconId` · `AssetId` 리터럴 타입을 함께 내보낸다. 없는 id를 쓰면 컴파일 에러가 난다.

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
| `EmptyState` | `icon` `title` `body` `action` | 결과 없음. "로딩이 끝난 건지 결과가 없는 건지" 를 가른다 |
| `Skeleton` | `rows` | 로딩 자리. 표가 들어올 크기를 미리 잡아 화면이 튀지 않게 한다 |
| `Checkbox` `ErrorBanner` | — | `features/auth` 에서 만들어졌다가 보안 화면이 두 번째 사용처가 되어 승격 (§4.4) |
| `LineChart` / `BarChart` | Recharts 래퍼 | DAU 추이 / 젬 유입·소비 (§9.1) |
| **미구현** `Switch` `Pagination` `Select` `Textarea` `Dialog` `Toast` | — | 목록·폼 화면 착수 시. `Dialog` 는 `TabBar` 의 `window.confirm` 을 대체할 자리이기도 하다 |

> **`Segmented` 는 `<button role=\"radio\">` 가 아니라 네이티브 `<input type=\"radio\">` 를
> 숨겨서 쓴다.** 역할만 선언하면 스크린리더는 "라디오 그룹"이라 알리는데 화살표 키가
> 동작하지 않아 **없는 조작법을 약속**하게 된다. 같은 `name` 을 공유하는 네이티브
> 라디오는 화살표 이동·roving 포커스를 브라우저가 준다. `Checkbox` 와 같은 방식이다.

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

```
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

```
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

```
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

```
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
// ✓ TODO(shared/ui 에 Dialog 가 생기면): window.confirm 을 교체한다
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

| 오탐·누락 | 원인 |
|---|---|
| `const LABEL = 'TODO: …'` 를 위반으로 잡음 | 줄 전체에서 `TODO` 를 찾음 |
| 템플릿 리터럴 안의 `// TODO:` 를 주석으로 봄 | 여러 줄에 걸친 문자열 상태를 안 봄 |
| `// TODO: 급함; TODO(조건): 나중` 이 통과 | 주석당 한 번만 검사 |

셋 다 픽스처 한 줄이면 잡혔을 것들이다. **오탐이 규칙을 죽인다면, 검사기의 오탐은
검사기를 죽인다** — 그래서 `vite.config.ts` 의 `include` 가 `scripts/` 까지 본다.
