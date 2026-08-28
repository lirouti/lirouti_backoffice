import { useEffect, useRef, useState } from 'react'

import { Button } from '@/shared/ui/Button'

/**
 * 클립보드 복사 버튼. 성공하면 잠깐 "복사됨" 으로 바뀐다.
 *
 * 타이머를 **ref 로 들고 unmount 에서 지운다.** 짧은 일회성 타이머라도 화면이
 * keep-alive 로 살아 있는 이 어드민에서는 남겨 두면 언젠가 죽은 컴포넌트에 setState 한다.
 */
export function CopyButton({ text, label = '복사' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 클립보드 권한이 없으면 조용히 넘어간다 — 화면에 값이 그대로 보이므로
      // 손으로 옮겨 적을 수 있다. 여기서 에러를 띄우면 겁만 준다.
      return
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button size="sm" onClick={copy} aria-live="polite">
      {copied ? '복사됨' : label}
    </Button>
  )
}
