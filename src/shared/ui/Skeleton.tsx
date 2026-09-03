/**
 * 로딩 자리 — **들어올 것의 자리와 크기를 미리 잡는다** (docs/ARCHITECTURE.md §43).
 *
 * 「불러오는 중…」 텍스트보다 나은 이유는 글자가 예뻐서가 아니라, 데이터가 도착할 때
 * **화면이 튀지 않기** 때문이다. 그래서 원칙 셋이 따라온다.
 *
 *  1. **모양이 같아야 한다.** 카드가 올 자리엔 카드, 표가 올 자리엔 행. 목록 행 하나로
 *     전부 덮으면 자리를 잡아 주기는커녕 더 크게 튄다.
 *  2. **이미 아는 것은 지우지 않는다.** 제목·부제·버튼은 데이터가 없어도 그릴 수 있다.
 *     화면이 헤더를 그린 뒤 **본문만** 이걸로 채운다.
 *  3. **모르는 것은 흉내 내지 않는다.** 몇 건이 올지 모르면 적당한 수만 그린다.
 *
 * `EmptyState`(「비었음」)와 다른 상태라 파일을 나눴다 — 이건 「오는 중」이다.
 */
import { css, cx } from 'styled-system/css'

/** 막대 한 줄의 너비 조합. 다 같으면 기계처럼 보인다 */
const WIDTHS = [
  ['70%', '44%'],
  ['52%', '62%'],
  ['64%', '38%'],
  ['46%', '54%'],
] as const

/**
 * 회색 막대.
 *
 * ⚠️ **`prefers-reduced-motion` 을 존중한다.** 스켈레톤은 이제 화면을 통째로 채울 수
 *    있어서, 전정기관이 예민한 사람에게 **넓은 면적이 맥동하는 것**은 작은 막대 몇 개와
 *    전혀 다른 경험이다. 자동 접근성 검사는 이걸 보지 않으므로 여기서 지킬 수밖에 없다.
 */
const bar = css({
  borderRadius: '5px',
  bg: 'surf2',
  // ⚠️ **고정 px 너비를 주는 자리가 있다**(`SkeletonPage` 의 제목 180 · 부제 320).
  //    담는 칸이 그보다 좁으면 **페이지가 가로로 스크롤된다** — 실제로 200px 컨테이너에서
  //    scrollWidth 320 > clientWidth 200 이 났다. 퍼센트 막대는 저절로 줄지만 px 은 안 준다.
  maxWidth: '100%',
  animation: 'rvPulse 1.8s ease-in-out infinite',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
})

/**
 * 스크린리더에게 「오는 중」임을 알리는 껍데기.
 *
 * ⚠️ **막대 자체는 읽히면 안 된다.** 빈 `div` 수십 개를 읽어 주는 것은 소음이라
 *    안쪽 전부가 `aria-hidden` 이고, 상태는 이 한 줄로만 말한다.
 */
const region = (silent: boolean) =>
  silent ? ({ 'aria-hidden': true } as const) : ({ role: 'status', 'aria-label': '불러오는 중' } as const)

type Common = {
  /**
   * 한 화면에 스켈레톤을 **여러 개 겹쳐 쓸 때** 하나만 남기고 켠다.
   * 안 그러면 스크린리더가 「불러오는 중」을 두 번 읽는다.
   */
  silent?: boolean
  className?: string
}

/** 목록·표의 행. 아바타 자리 + 글줄 둘 */
export function SkeletonRows({ rows = 4, silent = false, className }: Common & { rows?: number }) {
  return (
    <div
      {...region(silent)}
      className={cx(css({ display: 'flex', flexDirection: 'column', gap: '12px' }), className)}
    >
      {Array.from({ length: rows }, (_, i) => {
        const [w1, w2] = WIDTHS[i % WIDTHS.length]!
        return (
          <div key={i} className={css({ display: 'flex', alignItems: 'center', gap: '12px' })} aria-hidden="true">
            <div className={cx(bar, css({ width: '34px', height: '34px', flex: 'none', borderRadius: 'lg' }))} />
            <div className={css({ flex: '1', minWidth: '0' })}>
              <div className={bar} style={{ height: 10, width: w1 }} />
              <div className={bar} style={{ height: 9, width: w2, marginTop: 6 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * 카드 격자. 그림 타일 + 이름 + 한 줄.
 *
 * ⚠️ **`min` 은 그 화면이 쓰는 `minmax` 값과 같아야 한다.** 배경 190 · 업적 200 · 둥지 280 ·
 *    성장 170 으로 **전부 다르다.** 다르게 주면 스켈레톤과 실제의 **열 수가 달라져** 데이터가
 *    도착하는 순간 격자가 다시 짜인다 — 막으려던 바로 그 일이다.
 */
export function SkeletonCards({
  count = 8,
  min = 200,
  silent = false,
  className,
}: Common & { count?: number; min?: number }) {
  return (
    <div
      {...region(silent)}
      className={cx(css({ display: 'grid', gap: '13px' }), className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={css({ border: '1px solid token(colors.bd)', borderRadius: 'xl', overflow: 'hidden' })}
        >
          <div className={cx(bar, css({ width: 'full', aspectRatio: '1', borderRadius: '0' }))} />
          <div className={css({ p: '10px 12px 12px', borderTop: '1px solid token(colors.ln)' })}>
            <div className={bar} style={{ height: 10, width: WIDTHS[i % WIDTHS.length]![0] }} />
            <div className={bar} style={{ height: 9, width: WIDTHS[i % WIDTHS.length]![1], marginTop: 6 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * 지표 타일 한 줄. 라벨 한 줄 + 큰 숫자 한 줄.
 *
 * ⚠️ **`min` 은 그 화면의 `minmax` 와 같아야 한다** — `SkeletonCards` 와 같은 이유다.
 *    지표 화면은 200, 결제·업적 목록은 150 으로 서로 다르다. 150 으로 고정해 두었더니
 *    지표 6개가 **5 + 1 로 줄바꿈**되어 데이터가 올 때 한 줄로 다시 접혔다.
 */
export function SkeletonStats({
  count = 4,
  min = 150,
  silent = false,
  className,
}: Common & { count?: number; min?: number }) {
  return (
    <div
      {...region(silent)}
      className={cx(css({ display: 'grid', gap: '12px' }), className)}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={css({
            border: '1px solid token(colors.bd)',
            borderRadius: 'xl',
            bg: 'surf',
            px: '17px',
            pt: '15px',
            pb: '16px',
          })}
        >
          {/* `StatCard` 와 같은 **세 줄**이다 — 라벨 · 큰 숫자 · 증감. 두 줄로 두었더니
              타일 높이가 짧아 데이터가 올 때 아래가 통째로 밀렸다. */}
          <div className={bar} style={{ height: 11, width: '42%' }} />
          <div className={bar} style={{ height: 26, width: '60%', marginTop: 7 }} />
          <div className={bar} style={{ height: 10, width: '52%', marginTop: 6 }} />
        </div>
      ))}
    </div>
  )
}

/**
 * 폼 — 좌측 입력 카드 + 우측 사이드 카드.
 *
 * 실제 폼들이 `flex: 3 1 460px` / `1 1 280px` 로 나뉘어 있어 같은 비율을 쓴다.
 */
export function SkeletonForm({
  fields = 4,
  side = true,
  silent = false,
  className,
}: Common & { fields?: number; side?: boolean }) {
  return (
    <div
      {...region(silent)}
      className={cx(css({ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' }), className)}
    >
      <div
        aria-hidden="true"
        className={css({
          flex: '3 1 460px',
          minWidth: '0',
          border: '1px solid token(colors.bd)',
          borderRadius: 'xl',
          bg: 'surf',
          p: '17px 20px',
        })}
      >
        <div className={bar} style={{ height: 12, width: '22%' }} />
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '18px', mt: '18px' })}>
          {Array.from({ length: fields }, (_, i) => (
            <div key={i}>
              <div className={bar} style={{ height: 9, width: '18%' }} />
              <div className={cx(bar, css({ borderRadius: 'lg' }))} style={{ height: 38, marginTop: 7 }} />
            </div>
          ))}
        </div>
      </div>

      {side && (
        <div
          aria-hidden="true"
          className={css({
            flex: '1 1 280px',
            minWidth: '250px',
            maxWidth: '360px',
            border: '1px solid token(colors.bd)',
            borderRadius: 'xl',
            bg: 'surf',
            p: '15px',
          })}
        >
          <div className={bar} style={{ height: 12, width: '40%' }} />
          <div className={cx(bar, css({ width: 'full', aspectRatio: '1', mt: '12px' }))} />
          <div className={cx(bar, css({ borderRadius: 'lg' }))} style={{ height: 34, marginTop: 12 }} />
        </div>
      )}
    </div>
  )
}

/**
 * 아무 모양도 아닌 큰 덩어리.
 *
 * 차트처럼 **안이 어떻게 생겼는지 흉내 낼 수 없는 것**의 자리를 잡는다. 축과 선을 그리면
 * 실제 차트와 다른 그림이 되어 오히려 튄다 — 원칙 ③(모르는 것은 흉내 내지 않는다).
 */
export function SkeletonBlock({ height = 120, silent = false, className }: Common & { height?: number }) {
  return (
    <div {...region(silent)} className={className}>
      <div className={cx(bar, css({ width: 'full', borderRadius: 'lg' }))} style={{ height }} aria-hidden="true" />
    </div>
  )
}

/**
 * 제목·부제 자리.
 *
 * **제목이 불러온 값인 화면**에서 쓴다 — 상세 화면의 제목은 「소이」 처럼 데이터에서 오므로
 * 로딩 중에는 그릴 수가 없다. 아는 것(고정 제목)이 있으면 이걸 쓰지 말고 **진짜 `PageHeader`**
 * 를 그린다 (docs/ARCHITECTURE.md §43.2 — 아는 것과 모르는 것을 섞지 않는다).
 */
export function SkeletonHeader({ silent = false, className }: Common) {
  return (
    <div {...region(silent)} className={className}>
      <div aria-hidden="true" className={css({ mb: '18px' })}>
        <div className={bar} style={{ height: 22, width: '180px' }} />
        <div className={bar} style={{ height: 10, width: '320px', marginTop: 10 }} />
      </div>
    </div>
  )
}

/**
 * 화면 골격 — 라우트 폴백 전용.
 *
 * ⚠️ **여기서는 어떤 화면이 올지 모른다.** `<Suspense>` 가 lazy 청크를 기다리는 시점이라
 *    화면 컴포넌트가 아직 없다. 그래서 **공통 골격**(제목 자리 + 본문 블록)만 그린다.
 *
 * `matchScreen(pathname)` 으로 화면 id 는 알 수 있지만 **그 화면이 어떤 모양인지는
 * `domain/screens.ts` 가 모른다.** 넣으려면 도메인에 표현 정보를 들이게 되고(§4.4),
 * 얻는 것은 청크가 도착하기까지 수백 ms 동안의 정확도뿐이다.
 *
 * 정확한 모양은 **데이터 로딩 스켈레톤**이 맡는다 — 그때는 화면이 자기 모양을 안다.
 */
export function SkeletonPage() {
  return (
    <div {...region(false)}>
      <SkeletonHeader silent />
      <SkeletonRows rows={6} silent />
    </div>
  )
}
