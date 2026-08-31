/**
 * ⌘K(맥) · Ctrl+K — 커맨드 팔레트 여닫기.
 *
 * ⚠️ **`preventDefault` 가 필수다.** 크롬에서 ⌘K 는 주소창 검색으로 가는 단축키라,
 *    막지 않으면 **팔레트가 열리는 동시에 주소창으로 포커스가 빠진다.**
 *
 * ⚠️ **`metaKey` 와 `ctrlKey` 를 둘 다 본다.** 맥은 ⌘, 윈도는 Ctrl 이고, 운영자가 어느
 *    쪽을 쓰는지는 우리가 모른다 — 한쪽만 보면 절반에게는 없는 기능이 된다.
 */
import { useEffect } from 'react'

/** @param toggle 눌렸을 때. 열려 있으면 닫고 아니면 연다 */
export function usePaletteHotkey(toggle: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ⚠️ `e.key` 는 IME 조합 중에 `Process` 가 된다. 한글을 치다 ⌘K 를 눌러도
      //    열려야 해서 `code`(물리 키) 로 본다.
      if (e.code !== 'KeyK' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle])
}
