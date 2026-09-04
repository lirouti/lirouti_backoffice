/** 운영 화면 사이에 넘기는 query 값을 폼 입력으로 정규화한다. */
import { parseUserIds } from '@/domain/user'

/** `?who=`의 회원 UID를 지급 폼 표기로 정규화한다 */
export const grantWhoFrom = (params: URLSearchParams): string =>
  parseUserIds(params.get('who') ?? '').join(', ')
