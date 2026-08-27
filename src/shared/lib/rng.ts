/**
 * 디자인 원본(`Component.rng`)의 시드 난수 생성기.
 *
 * 목 데이터는 **결정적**이어야 한다. Math.random 을 쓰면 새로고침할 때마다 숫자가 튀어서
 * 스크린샷 비교도, 디자인 대조도 불가능해진다. 원본 알고리즘을 그대로 유지한다.
 */
export function rng(seed: number): () => number {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}
