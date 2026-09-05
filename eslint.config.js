import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import perfectionist from 'eslint-plugin-perfectionist'
import tseslint from 'typescript-eslint'

/**
 * 레이어 경계를 ESLint 로 강제한다. (docs/ARCHITECTURE.md §4.3)
 *
 * 의존은 아래로만 흐른다:
 *   app → layouts │ features → entities │ stores │ api → mocks → domain → shared → assets
 *
 * entities 는 features 바로 아래의 **도메인 UI** 다. api 는 부르지만 stores 는 못 본다 —
 * 전역 상태를 아는 순간 그 화면 전용이 되어 features 안에 두는 게 맞아진다.
 *
 * 규칙이 문서에만 있으면 반드시 새어 나간다. 실제로 이 프로젝트에서도
 * `shared/ui` 가 도메인 타입을 prop 으로 받으면서 shared ⇄ domain 순환이 한 번 생겼다.
 */

/** 각 층이 **가져오면 안 되는** 층. 나열되지 않은 층은 허용. */
const FORBIDDEN = {
  shared: ['app', 'layouts', 'features', 'stores', 'api', 'mocks', 'domain'],
  domain: ['app', 'layouts', 'features', 'stores', 'api', 'mocks'],
  mocks: ['app', 'layouts', 'features', 'stores', 'api'],
  api: ['app', 'layouts', 'features', 'stores'],
  stores: ['app', 'layouts', 'features', 'api', 'mocks'],
  // features 끼리도 서로 참조 금지 — 같은 feature 안은 상대경로(`./`)를 쓴다
  features: ['app', 'layouts', 'mocks', 'features'],
  // 도메인 타입을 받는 공용 UI. features 바로 아래라 화면·셸·전역 상태를 몰라야 한다
  entities: ['app', 'layouts', 'features', 'stores', 'mocks'],
  layouts: ['app', 'features', 'api', 'mocks'],
}

/** 층별 기본 사유 */
const WHY = {
  shared:
    'shared 는 최하층이라 위쪽을 몰라야 합니다. 필요한 모양을 자기 prop 계약으로 선언하세요 — 구조적 타이핑이라 도메인 타입을 그대로 넘길 수 있습니다.',
  domain: 'domain 은 순수 규칙 층입니다. 데이터 출처·상태·화면을 알면 안 됩니다.',
  mocks: 'mocks 는 데이터 구현체입니다. 화면이나 상태를 참조하면 서버로 교체할 때 딸려 갑니다.',
  api: 'api 는 데이터 파사드입니다. 화면·상태에 의존하면 파사드의 의미가 없습니다.',
  stores: 'stores 는 상태 그릇입니다. 규칙은 domain 으로, 데이터는 api 로 보내세요.',
  features: 'features 는 화면 층입니다. 위쪽이나 옆을 참조할 수 없습니다.',
  entities:
    'entities 는 여러 화면이 함께 쓰는 도메인 UI 입니다. 특정 화면이나 전역 상태를 알면 그 화면 전용이 되어 버립니다 — 그러면 features 안에 두는 게 맞습니다.',
  layouts:
    'layouts 는 모든 화면이 공유하는 셸입니다. 특정 화면이나 데이터 계층을 알면 안 됩니다.',
}

/** (from → to) 특수 안내 */
const PAIR = {
  'features>features':
    'features 끼리는 서로 참조하지 않습니다. 공유가 필요하면 domain/shared/api 로 올리고, 같은 feature 안은 상대경로(./)를 쓰세요.',
  'features>mocks':
    '화면은 mocks 를 직접 보지 않습니다. api 파사드를 거치세요 — 서버로 갈아탈 때 화면을 손대지 않기 위한 경계입니다.',
  'entities>mocks': '공용 도메인 UI 도 mocks 를 직접 보지 않습니다. api 파사드를 거치세요.',
  'entities>features':
    'entities 는 features 아래층입니다. 특정 화면의 조각이 필요하면 그건 아직 공용이 아니라는 뜻이라, 그 feature 안에 두세요.',
  'layouts>api':
    '셸은 데이터를 가져오지 않습니다. 데이터가 필요하면 그 화면(features)에서 부르세요.',
  'stores>api':
    '스토어에서 데이터를 부르지 마세요. 화면이 api 를 부르고 결과만 스토어에 넣습니다.',
}

/**
 * 층 단위로는 못 잡는 추가 제약.
 *
 * ESLint 는 같은 규칙을 여러 config 블록에 나눠 쓰면 **덮어쓴다**(병합하지 않는다).
 * 그래서 별도 블록으로 두지 않고 해당 층의 패턴 목록에 끼워 넣는다.
 */
const EXTRA = {
  entities: [
    {
      group: ['@/api/core'],
      message:
        '공용 도메인 UI 도 HTTP 를 직접 부르지 않습니다. `api/<entity>` 파사드를 거치세요.',
    },
  ],
  features: [
    {
      // `@/api/core` 는 전송 계층(axios 인스턴스·쿼리 키). 하위 경로까지 전부 막힌다.
      // 화면이 써야 하는 에러 타입은 `@/api/error` 로 루트에 내놨다.
      group: ['@/api/core'],
      message:
        '화면은 HTTP 를 직접 부르지 않습니다. `api/<entity>` 파사드를 거치세요 — 그래야 목/실서버 교체가 파사드 안쪽에서 끝납니다. 에러 타입이 필요하면 `@/api/error` 를 쓰세요.',
    },
  ],
}

const layerRules = Object.entries(FORBIDDEN).map(([layer, forbidden]) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          ...forbidden.map((target) => ({
            group: [`@/${target}`, `@/${target}/*`, `@/${target}/**`],
            message:
              PAIR[`${layer}>${target}`] ??
              `${layer} → ${target} 은 허용되지 않는 방향입니다. ${WHY[layer]}`,
          })),
          ...(EXTRA[layer] ?? []),
        ],
      },
    ],
  },
}))

export default tseslint.config(
  { ignores: ['dist', 'styled-system', 'design', 'node_modules', 'src/assets'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh, perfectionist },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // 타입 전용 import 는 `type` 으로 표시한다. (docs/ARCHITECTURE.md §13.5)
      // 런타임 import 가 남지 않아 §4.3 의 레이어 그래프가 실제 의존만 반영한다.
      // fixStyle: 값과 타입을 같이 주는 모듈은 import 문 하나로 유지한다
      //   → `import { SCREENS, type ScreenId } from '@/domain/screens'`
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // import 를 **레이어 순서**로 정렬한다. (docs/ARCHITECTURE.md §15)
      // 목록을 위에서 아래로 읽으면 이 파일이 어느 층에 의존하는지 그대로 보인다.
      // 순서는 §4.3 의 의존 그래프와 같다 — 아래층(shared)부터 위층(app)으로.
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'alphabetical',
          order: 'asc',
          newlinesBetween: 1,
          internalPattern: ['^@/.*'],
          customGroups: [
            { groupName: 'react', elementNamePattern: ['^react$', '^react-dom'] },
            { groupName: 'pandacss', elementNamePattern: ['^styled-system'] },
            { groupName: 'assets', elementNamePattern: ['^@/assets'] },
            { groupName: 'shared', elementNamePattern: ['^@/shared'] },
            { groupName: 'domain', elementNamePattern: ['^@/domain'] },
            { groupName: 'mocks', elementNamePattern: ['^@/mocks'] },
            { groupName: 'api', elementNamePattern: ['^@/api'] },
            { groupName: 'stores', elementNamePattern: ['^@/stores'] },
            { groupName: 'entities', elementNamePattern: ['^@/entities'] },
            { groupName: 'layouts', elementNamePattern: ['^@/layouts'] },
            { groupName: 'features', elementNamePattern: ['^@/features'] },
            { groupName: 'app', elementNamePattern: ['^@/app'] },
          ],
          groups: [
            'react',
            'external',
            'pandacss',
            'assets',
            'shared',
            'domain',
            'mocks',
            'api',
            'stores',
            'entities',
            'layouts',
            'features',
            'app',
            ['parent', 'sibling', 'index'],
            'style',
            'unknown',
          ],
        },
      ],

      // 같은 모듈을 두 번 import 하지 않는다.
      // `consistent-type-imports` 가 inline 형태를 강제하지만, 이미 갈라진 문장을 합쳐주진 않는다.
      'no-duplicate-imports': 'error',

      // 타입 선언은 `type` 으로 통일한다. (docs/ARCHITECTURE.md §13)
      // hover 에서 구조가 그대로 보이고, Pick/Omit/조건부/매핑 조합이 자유롭고,
      // 선언 병합으로 몰래 확장되지 않는다.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
    },
  },

  // 모듈·전역 확장은 선언 병합이 필요해서 `type` 으로 대체할 수 없다.
  // 확장은 .d.ts 에만 두고, 여기서만 interface 를 허용한다.
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/consistent-type-definitions': 'off' },
  },

  ...layerRules,

  // domain 은 React·상태 라이브러리·스타일 시스템을 몰라야 한다.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'domain 은 순수 TypeScript 여야 합니다. 훅이 필요하면 layouts/features 로 올리세요.',
            },
            { name: 'react-dom', message: 'domain 은 순수 TypeScript 여야 합니다.' },
            {
              name: 'react-router',
              message:
                'domain 은 라우터를 몰라야 합니다. 경로 정보는 SCREENS 데이터로 표현하세요.',
            },
            {
              name: 'zustand',
              message:
                'domain 은 상태 저장소를 몰라야 합니다. 규칙은 인자를 받아 값을 돌려주세요.',
            },
          ],
          patterns: [
            {
              group: ['styled-system', 'styled-system/*', 'styled-system/**'],
              message: 'domain 은 스타일 시스템을 몰라야 합니다.',
            },
            {
              group: [
                '@/app',
                '@/app/*',
                '@/layouts/*',
                '@/features/*',
                '@/entities/*',
                '@/stores/*',
                '@/api/*',
                '@/mocks/*',
              ],
              message: WHY.domain,
            },
            {
              // domain 내부끼리는 상대경로로 참조한다.
              // `@/domain/item` 은 배럴(index.ts)이라 엔티티 안에서 쓰면 순환 참조가 된다.
              group: ['@/domain', '@/domain/*', '@/domain/**'],
              message:
                'domain 내부에서는 상대경로로 참조하세요 — `../item/types` 처럼 파일을 직접 가리킵니다. `@/domain/item` 은 배럴이라 같은 폴더 안에서 순환 참조가 생깁니다.',
            },
          ],
        },
      ],
    },
  },

  // router.tsx 는 컴포넌트 파일이 아니라 라우트 트리를 내보낸다.
  {
    files: ['src/app/router.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // 프로덕션 코드는 테스트 러너를 몰라야 한다.
  //
  // Maven/Gradle 은 `src/main` 과 `src/test` 가 **별도 classpath** 라 JUnit 이 프로덕션에서
  // 컴파일조차 안 된다 — 폴더가 아니라 툴체인이 경계를 강제한다. npm/bun 은 `node_modules`
  // 가 하나라서 그 보장이 없다. `devDependencies` 는 배포 구분일 뿐 import 를 막지 않는다.
  // 테스트를 어느 폴더에 두든 마찬가지라, 그 경계를 여기서 만든다.
  //
  // `no-restricted-imports` 를 쓰지 않는 이유: 그 룰은 같은 파일에 두 번 정의되면 **병합이
  // 아니라 덮어쓰기** 라, 여기에 vitest 를 넣으면 위에서 세운 레이어 규칙이 통째로 날아간다.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ImportDeclaration[source.value=/^(vitest|@vitest\\/)/]',
          message:
            '테스트 러너는 `*.test.ts` 에서만 씁니다. 프로덕션 코드가 vitest 를 import 하면 번들에 딸려 들어갑니다.',
        },
      ],
    },
  },

  // 설정 파일과 스크립트는 브라우저 전역이 아니다.
  {
    files: ['*.config.{js,ts}', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-restricted-imports': 'off' },
  },
)
