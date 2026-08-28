import { rng } from '@/shared/lib/rng'

/**
 * 2단계 인증 목 데이터.
 *
 * 실서버라면 시크릿도 백업 코드도 **서버가 만들고 서버가 보관**한다. 여기서 만드는 건
 * 화면을 끝까지 돌려 보기 위한 흉내다 — 클라이언트에서 시크릿을 생성하는 설계로
 * 오해하지 말 것.
 *
 * 초기 상태는 **켜짐**이다. 목 로그인이 모든 계정에 2차 인증을 요구하므로
 * (`api/auth.ts`) 여기서 꺼져 있다고 하면 두 화면이 서로 다른 말을 하게 된다.
 * 등록 흐름을 보려면 화면에서 한 번 끄면 된다.
 */
import { BACKUP_CODE_COUNT, type TotpStatus } from '@/domain/totp'

/** RFC 4648 base32. 인증 앱이 읽을 수 있는 유일한 표기다. */
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 백업 코드용. 0·O·1·I·L 을 뺐다 — 손으로 옮겨 적을 때 반드시 헷갈린다. */
const UNAMBIGUOUS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * 발급할 때마다 다른 값이 나와야 "재발급"이 동작하는 것으로 보인다.
 * 그렇다고 `Math.random` 을 쓰면 새로고침마다 튀어서 화면 대조가 불가능해진다.
 * **호출 순서에 따라 결정되는** 시드를 쓴다 — 같은 순서로 누르면 같은 값이 나온다.
 */
let issued = 0
const nextSeed = () => 7919 + issued++ * 131

function pick(alphabet: string, length: number, seed: number): string {
  const next = rng(seed)
  return Array.from({ length }, () => alphabet[Math.floor(next() * alphabet.length)]!).join('')
}

/** 160비트 = base32 32자. RFC 6238 권장 길이. */
export const makeSecret = (): string => pick(BASE32, 32, nextSeed())

/** `XXXX-XXXX` 꼴. 가운데 하이픈이 있어야 옮겨 적을 때 자리를 놓치지 않는다. */
export function makeBackupCodes(): string[] {
  const seed = nextSeed()
  return Array.from({ length: BACKUP_CODE_COUNT }, (_, i) => {
    const raw = pick(UNAMBIGUOUS, 8, seed + i * 17)
    return `${raw.slice(0, 4)}-${raw.slice(4)}`
  })
}

/**
 * 세션 동안 유지되는 상태. 새로고침하면 초기값으로 돌아간다 — 서버가 없으니 당연하다.
 */
export const securityState: { totp: TotpStatus } = {
  totp: {
    enabled: true,
    enrolledAt: '2026-03-14T09:20:00+09:00',
    backupCodesLeft: BACKUP_CODE_COUNT,
  },
}
