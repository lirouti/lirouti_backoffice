import react from '@vitejs/plugin-react-swc'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // svgr: `import X from './x.svg?react'` → React 컴포넌트.
  // 확장자 없는 기본 import 는 그대로 URL 을 준다 (캐릭터 에셋이 이 경로를 쓴다).
  plugins: [react(), svgr()],

  // tsconfig.json 의 paths 를 그대로 쓴다 (Vite 8 네이티브 — 별도 플러그인 불필요)
  resolve: { tsconfigPaths: true },

  build: {
    // 캐릭터 에셋을 base64 로 JS 에 녹이지 않는다.
    // 화면마다 5~12개만 쓰는데 50개를 번들에 넣으면 파일로 뺀 의미가 없다.
    assetsInlineLimit: (file) => (file.endsWith('.svg') ? false : undefined),

    // manualChunks 로 recharts 를 따로 빼려다 되돌렸다.
    // 청크를 강제하면 Rollup 이 공용 모듈까지 그 청크에 배치해서, 엔트리가
    // charts 를 **정적으로** 의존하게 된다 — 로그인 화면에도 105KB 가 딸려왔다.
    // 자동 분할이 이미 recharts 를 lazy 한 DashboardPage 청크에 넣어준다. (§9.2)
  },

  server: { port: 5173 },

  test: {
    // `domain/` 은 React 도 DOM 도 쓰지 않는다 — jsdom 을 띄울 이유가 없다.
    environment: 'node',
    // **시간대를 고정한다.** `date()` 는 오프셋이 붙은 값을 파싱한 뒤 지역 시간으로
    // 찍으므로, 실행 환경의 TZ 에 따라 하루가 밀린다 — `'…T09:20:00+09:00'` 은
    // UTC 서쪽에서 전날이 된다. 고정하지 않으면 개발자 노트북에서는 통과하고
    // CI 에서만 깨지는(또는 그 반대인) 테스트가 된다. (TZ=America/New_York 로 재현함)

    env: { TZ: 'Asia/Seoul' },

    // `.tsx` 도 잡는다 — jsdom·Testing Library 를 들였다 (§60).
    //
    // ⚠️ **환경은 `node` 로 둔다.** DOM 이 필요한 파일이 첫 줄에 `@vitest-environment
    //    jsdom` 을 스스로 선언한다 — 설정에 glob 을 두면 「어느 파일이 DOM 을 쓰는가」가
    //    파일 밖에 숨고, 순수 층 테스트 700여 개가 이유 없이 브라우저를 흉내 낸다.
    //
    // ⚠️ **`test` 스크립트가 `panda codegen` 을 먼저 돈다.** 컴포넌트 테스트는
    //    `styled-system/css` 를 타는데 그건 **생성물이라 깨끗한 클론에 없다** — 붙이지
    //    않으면 새 머신에서 `bun run test` 가 통째로 깨진다 (`typecheck` 와 같은 이유).
    //
    // `scripts/` 도 넣는다. 규약 검사기들은 **코드를 읽는 코드**라 눈으로 맞는지
    // 확인할 수가 없고, 실제로 주석 검사기가 오탐을 세 번 냈다. 환경(node)과
    // 성질(순수 함수)이 같아 위의 경계는 그대로다.
    include: ['{src,scripts}/**/*.test.{ts,tsx}'],

    setupFiles: ['./vitest.setup.ts'],
  },
})
