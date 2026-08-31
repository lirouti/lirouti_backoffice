/** 쿠폰 코드값 → 한글 표시 + 배지 tone. */
import type { BadgeTone } from '@/shared/ui/tone'

import type { CouponKind, CouponReward, CouponStatus, CouponUseLog } from './types'

export const COUPON_KIND_LABEL: Record<CouponKind, string> = {
  single: '단일 코드',
  bulk: '일괄 발급',
  serial: '시리얼 등록',
  influencer: '인플루언서 전용',
}

/** 방식을 고를 때 옆에 붙는 설명. **코드가 하나인지 여럿인지를 여기서 말한다** */
export const COUPON_KIND_HINT: Record<CouponKind, string> = {
  single: '모두 같은 코드를 입력합니다. 공지나 방송에 씁니다',
  bulk: '1인 1코드로 대량 발급합니다. CSV로 내려받습니다',
  serial: '오프라인 배포용 코드를 미리 등록해 둡니다',
  influencer: '채널별 코드를 만들고 유입을 따로 집계합니다',
}

export const COUPON_KIND_TONE: Record<CouponKind, BadgeTone> = {
  single: 'brand',
  bulk: 'purple',
  serial: 'teal',
  influencer: 'warn',
}

/** ⚠️ **「중단」 은 위험색이다.** 「종료」 와 같은 회색으로 두면 사람이 멈춘 것과 기간이 끝난 것이 안 갈린다 */
export const COUPON_STATUS_TONE: Record<CouponStatus, BadgeTone> = {
  '진행 중': 'success',
  종료: 'neutral',
  중단: 'danger',
}

export const REWARD_KIND_LABEL: Record<CouponReward['kind'], string> = {
  gem: '재화',
  item: '아이템',
  boost: '부스터',
  emoji: '이모티콘',
}

export const USE_RESULT_TONE: Record<CouponUseLog['result'], BadgeTone> = {
  '지급 완료': 'success',
  '중복 사용': 'warn',
  '기간 만료': 'danger',
}
