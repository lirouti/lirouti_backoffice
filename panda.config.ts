import { defineConfig } from '@pandacss/dev'

/**
 * 디자인 원본: Claude Design "리루티" / `리루티 운영 어드민.dc.html`
 *
 * 원본의 CSS 변수명(--pri, --gBg …)을 토큰 키로 그대로 사용한다.
 * 아직 포팅하지 않은 디자인 파일이 20개 넘게 남아 있고 전부 var(--X)를 쓰므로,
 * 키를 유지해야 포팅이 기계적 치환으로 끝난다. 자세한 근거는 docs/ARCHITECTURE.md §3.1.
 */
export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  exclude: [],
  outdir: 'styled-system',
  jsxFramework: 'react',

  // 원본은 :root[data-theme="dark"] 로 전환한다.
  // Panda 기본 _dark 는 클래스(.dark) 기준이라 조건을 덮어쓴다.
  conditions: {
    extend: {
      dark: '[data-theme=dark] &',
      light: '[data-theme=light] &',
    },
  },

  globalCss: {
    'html, body': {
      margin: '0',
      minHeight: '100%',
      bg: 'page',
      color: 'ink',
      fontFamily: 'sans',
      // 한글 줄바꿈: 단어 중간에서 끊지 않되, 넘치면 강제로 흘린다
      wordBreak: 'keep-all',
      overflowWrap: 'anywhere',
    },
    // 파란 글자는 `priD` 다 — `pri` 는 밝은 배경 위에서 4.35:1 로 본문 기준에 못 미친다.
    a: { color: 'priD', textDecoration: 'none', _hover: { color: 'pri' } },
    '*, *::before, *::after': { boxSizing: 'border-box' },
    '::selection': { bg: 'soft' },
  },

  theme: {
    extend: {
      tokens: {
        fonts: {
          sans: {
            value:
              "Pretendard, -apple-system, 'Apple SD Gothic Neo', system-ui, sans-serif",
          },
          /**
           * 시크릿 키·백업 코드처럼 **한 글자씩 옮겨 적는** 값에만 쓴다.
           * 등폭이어야 자리를 세기 쉽고, 0/O 와 1/l 이 구분된다.
           * 시스템 폰트만 쓴다 — 이 값을 못 읽으면 계정에 못 들어오므로 CDN 에 걸 수 없다.
           */
          mono: {
            value:
              "ui-monospace, SFMono-Regular, Menlo, 'Cascadia Mono', Consolas, monospace",
          },
        },
        radii: {
          xs: { value: '6px' },
          sm: { value: '7px' },
          md: { value: '8px' },
          lg: { value: '9px' },
          xl: { value: '12px' },
        },
      },

      semanticTokens: {
        colors: {
          // ── 표면 / 구조 ────────────────────────────────
          /** 페이지 바탕 */
          page: { value: { base: '#F7F8FA', _dark: '#12161C' } },
          /** 카드 · 사이드바 · 헤더 표면 */
          surf: { value: { base: '#ffffff', _dark: '#191E26' } },
          /** 한 단 낮은 표면 (검색 인풋 등) */
          surf2: { value: { base: '#FAFBFC', _dark: '#1E242D' } },
          /** 스티키 헤더 배경 (backdrop-blur 동반) */
          band: {
            value: { base: 'rgba(255,255,255,.94)', _dark: 'rgba(25,30,38,.94)' },
          },
          /** 버튼 · 행 hover */
          hov: { value: { base: '#F4F7FC', _dark: '#212936' } },
          /** 에셋 썸네일 배경 */
          prev: { value: { base: '#F3F7FD', _dark: '#171C24' } },
          /** 활성 탭 배경 · 행 hover */
          prev2: { value: { base: '#F7F9FC', _dark: '#161A21' } },

          // ── 경계선 ────────────────────────────────────
          /** 기본 보더 */
          bd: { value: { base: '#E4E7EB', _dark: '#2C323C' } },
          /** 약한 구분선 · 차트 그리드 */
          ln: { value: { base: '#EFF1F4', _dark: '#232932' } },
          /** 프로그레스 트랙 배경 */
          grid: { value: { base: '#EFF2F6', _dark: '#232932' } },
          /** 스위치 off 트랙 */
          track: { value: { base: '#D3D9E2', _dark: '#3A4150' } },
          /** "라이브" 배지 보더 */
          liveBd: { value: { base: '#D6E4FA', _dark: '#274063' } },
          /** 포커스 링 보더 */
          ringBd: { value: { base: '#2F7CEF', _dark: '#5B9BFF' } },
          /** 포커스 링 그림자 (0 0 0 3px) */
          ring: {
            value: { base: 'rgba(47,124,239,.18)', _dark: 'rgba(91,155,255,.24)' },
          },

          // ── 텍스트 (명도 3단계 + 비텍스트 1) ──────────────
          //
          // ⚠️ **디자인 원본에서 의도적으로 어둡게 바꾼 값들이다.** 원본 색은 WCAG AA
          //    대비 기준(본문 4.5:1)에 미달했다 — faint 2.98, faint2 2.10, 라이트 기준.
          //    남은 20개 화면을 포팅할 때 원본 색으로 "되돌리지" 말 것.
          //
          // 밝은 배경에서 4.5:1 을 넘는 회색은 서로 구분이 잘 안 된다. 그래서
          // **텍스트는 3단계까지만** 두고, 네 번째(`faint2`)는 텍스트에서 뺐다.
          // 대비는 가장 불리한 배경 기준으로 잰다 — 라이트는 `page`, 다크는 `surf2`.

          /** 본문 · 제목 (16.6:1) */
          ink: { value: { base: '#16191E', _dark: '#E7EAEF' } },
          /** 보조 설명 (7.1:1) */
          sub: { value: { base: '#50555D', _dark: '#A9AFB9' } },
          /** 캡션 · 플레이스홀더 · 비활성 텍스트 (4.6:1) — 텍스트의 최저선 */
          faint: { value: { base: '#6C717A', _dark: '#868C99' } },
          /**
           * 아이콘 · 구분자 chevron · 테두리 (3.1:1).
           *
           * **텍스트에 쓰지 말 것.** 비텍스트 UI 기준(3:1)만 만족한다.
           * 흐린 글자가 필요하면 `faint` 를 쓴다.
           */
          faint2: { value: { base: '#888D95', _dark: '#69707C' } },

          // ── 브랜드 ────────────────────────────────────
          /**
           * 주 액션 배경 · 활성 아이콘 · 차트 1계열.
           *
           * 원본 `#2F7CEF` 은 **흰 글자를 얹으면 4.00:1** 이라 기본 버튼이 기준 미달이었다.
           * 4.6:1 이 되도록 조금 어둡게 했다.
           *
           * ⚠️ **밝은 배경 위의 파란 글자로는 쓰지 말 것** — 그건 4.35:1 이라 여전히 미달이다.
           *    링크·활성 라벨은 `priD`(5.4:1). 이 토큰은 "칠하는 색"이고 `priD` 가 "쓰는 색"이다.
           */
          pri: { value: { base: '#2B72DC', _dark: '#5B9BFF' } },
          /** 주 액션 hover · **밝은 배경 위의 파란 텍스트** (5.4:1) */
          priD: { value: { base: '#1B5FD6', _dark: '#93BEFF' } },
          /** 활성 내비 배경 · 차트 영역 채움 */
          soft: { value: { base: '#EAF2FE', _dark: '#1C2C46' } },
          /** 차트 2계열 (소비 바) */
          chart: { value: { base: '#B9D3F8', _dark: '#2E5691' } },
          /** pri 위 텍스트 */
          onPri: { value: { base: '#ffffff', _dark: '#0E1420' } },

          // ── 상태 (fg/bg 쌍) ───────────────────────────
          /** 성공 · 노출중 · 진행 · 상승 */
          gFg: { value: { base: '#187C55', _dark: '#43C68D' } },
          gBg: { value: { base: '#E6F6EF', _dark: '#16302A' } },
          /** 주의 · 예약 · 검수중 */
          aFg: { value: { base: '#8A6314', _dark: '#E0A63C' } },
          aBg: { value: { base: '#FDF3E2', _dark: '#33290F' } },
          /** 위험 · 회수 · 하락 */
          rFg: { value: { base: '#BE3D47', _dark: '#F4707B' } },
          rBg: { value: { base: '#FCEDEE', _dark: '#3A2126' } },
          rBd: { value: { base: '#F3C9CD', _dark: '#5A2E35' } },
          /** 주간 챌린지 */
          pFg: { value: { base: '#7556C9', _dark: '#A98FF0' } },
          pBg: { value: { base: '#F1ECFD', _dark: '#282141' } },
          /** 중립 · 종료 · 미노출 */
          nFg: { value: { base: '#696F76', _dark: '#98A0AC' } },
          nBg: { value: { base: '#F2F4F7', _dark: '#252A34' } },
          /** 시즌 챌린지 */
          tFg: { value: { base: '#0C7A6E', _dark: '#3FC0B2' } },
          tBg: { value: { base: '#E3F6F3', _dark: '#12302E' } },
          /** 유료 등급 */
          goldFg: { value: { base: '#876818', _dark: '#E8C374' } },
          goldBg: { value: { base: '#FBF1D6', _dark: '#3A2F12' } },
          /** 운영자 미리보기 배너 */
          warnFg: { value: { base: '#8A6314', _dark: '#E8C374' } },
          warnBd: { value: { base: '#F5DFB4', _dark: '#4A3A16' } },

          // ── 기타 ──────────────────────────────────────
          /** 라이브 상태 점 */
          dot: { value: { base: '#22A06B', _dark: '#34C98A' } },
          /** 아바타 배경 / 글자 */
          avB: { value: { base: '#DCE6F6', _dark: '#22314A' } },
          avF: { value: { base: '#2A5FA8', _dark: '#A9C7F5' } },
          /** 위험 버튼 위 텍스트 */
          onDanger: { value: { base: '#ffffff', _dark: '#2A1013' } },
          /** 유료 아이템 썸네일 배경 (다크 고정 — 원본이 테마와 무관하게 어둡다) */
          tilePaid: { value: { base: '#14122B', _dark: '#14122B' } },
        },
      },

      // 로그인 화면의 배경 연출. 원본 디자인의 @keyframes 를 그대로 옮겼다.
      keyframes: {
        rvFlow: {
          '0%, 100%': { backgroundPosition: '0% 20%' },
          '50%': { backgroundPosition: '100% 80%' },
        },
        rvFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-9px)' },
        },
        rvShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        rvBlobA: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(60px,-40px) scale(1.16)' },
          '66%': { transform: 'translate(-38px,32px) scale(.9)' },
        },
        rvBlobB: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '40%': { transform: 'translate(-64px,36px) scale(1.2)' },
          '70%': { transform: 'translate(34px,42px) scale(.88)' },
        },
        rvBlobC: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '50%': { transform: 'translate(-46px,52px) scale(1.24)' },
        },
      },

      // 원본은 폰트 크기마다 letter-spacing 을 따로 붙인다 (한글 가독성).
      // 컴포넌트에서 매번 쓰지 않도록 텍스트 스타일로 묶는다.
      textStyles: {
        display: {
          value: { fontSize: '24px', lineHeight: '31px', letterSpacing: '-0.9px', fontWeight: '700' },
        },
        h2: {
          value: { fontSize: '19px', lineHeight: '27px', letterSpacing: '-0.5px', fontWeight: '700' },
        },
        h3: {
          value: { fontSize: '14px', lineHeight: '19px', letterSpacing: '-0.4px', fontWeight: '700' },
        },
        body: {
          value: { fontSize: '13px', lineHeight: '19px', letterSpacing: '-0.35px' },
        },
        label: {
          value: { fontSize: '12px', lineHeight: '17px', letterSpacing: '-0.3px' },
        },
        caption: {
          value: { fontSize: '11.5px', lineHeight: '16px', letterSpacing: '-0.3px' },
        },
        micro: {
          value: { fontSize: '11px', lineHeight: '15px', letterSpacing: '-0.3px' },
        },
      },
    },
  },
})
