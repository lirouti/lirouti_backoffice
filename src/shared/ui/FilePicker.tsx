import { useId, useState, type ReactNode } from 'react'

import { css, cx } from 'styled-system/css'

type FilePickerProps = {
  /** 위에 붙는 이름 */
  label: string
  /** `<input accept>` 그대로. 도메인이 정한다 (`@/domain/asset` 의 `acceptAttr`) */
  accept: string
  /** 평상시 안내. `error` 가 있으면 가려진다 */
  hint?: string
  /** 검증 실패 메시지. 있으면 테두리가 붉어지고 스크린리더가 함께 읽는다 */
  error?: string
  required?: boolean
  /** 지금 고른 파일의 이름. 있으면 「바꾸기」 로 바뀐다 */
  fileName?: string
  /** 왼쪽에 놓을 미리보기. 이 컴포넌트는 무엇을 그릴지 모른다 */
  preview?: ReactNode
  onPick: (file: File) => void
  /** 주면 「지우기」 가 나온다 */
  onClear?: () => void
  className?: string
}

/**
 * 파일 고르기 — 끌어다 놓기 + 클릭.
 *
 * **도메인을 모른다.** 무엇이 올바른 파일인지는 부르는 쪽이 정하고(`validateAssetFile`),
 * 여기는 결과만 `error` 로 받아 그린다. `Input` 과 같은 계약이라 폼 안에서 나란히 쓴다.
 *
 * ⚠️ **`<input type="file">` 을 `display:none` 으로 숨기지 말 것.** 포커스를 받지 못해
 *    **키보드로는 아예 열 수 없게 된다** — 마우스로만 쓰면 눈치채지 못하는 종류의 고장이다.
 *    여기서는 투명하게 만들어 영역 전체에 깔았다. 그래서 ① 어디를 눌러도 브라우저가
 *    직접 창을 열고(JS `click()` 대리 호출이 필요 없다) ② Tab 으로 닿으며
 *    ③ 포커스 링은 `_focusWithin` 으로 바깥 상자가 그린다.
 */
export function FilePicker({
  label,
  accept,
  hint,
  error,
  required,
  fileName,
  preview,
  onPick,
  onClear,
  className,
}: FilePickerProps) {
  const id = useId()
  const [dragging, setDragging] = useState(false)

  const msgId = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  const take = (files: FileList | null) => {
    const file = files?.[0]
    if (file) onPick(file)
  }

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={css({
          display: 'block',
          textStyle: 'label',
          fontWeight: '700',
          color: 'sub',
          mb: '6px',
        })}
      >
        {label}
        {required && (
          <span className={css({ color: 'rFg' })} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div
        // 끌어다 놓기. `onDragOver` 에서 막지 않으면 브라우저가 파일을 **그냥 열어 버린다**
        // (탭이 그 이미지로 바뀐다).
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          take(e.dataTransfer.files)
        }}
        className={cx(
          css({
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            p: '11px 13px',
            borderRadius: 'lg',
            borderWidth: '1px',
            borderStyle: 'dashed',
            borderColor: 'bd',
            bg: 'surf',
            transition: 'border-color .12s, background .12s, box-shadow .12s',
            _hover: { borderColor: 'faint2', bg: 'hov' },
            _focusWithin: {
              borderColor: 'ringBd',
              borderStyle: 'solid',
              boxShadow: '0 0 0 3px token(colors.ring)',
            },
          }),
          dragging && css({ borderColor: 'ringBd', borderStyle: 'solid', bg: 'soft' }),
          error && css({ borderColor: 'rBd' }),
        )}
      >
        {preview ?? <UploadIcon />}

        <span className={css({ flex: '1', minWidth: '0' })}>
          <span
            className={css({
              display: 'block',
              textStyle: 'body',
              fontWeight: '600',
              color: 'ink',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            })}
          >
            {fileName ?? '파일을 끌어다 놓거나 눌러서 고르세요'}
          </span>
          <span
            className={css({ display: 'block', mt: '2px', textStyle: 'micro', color: 'faint' })}
          >
            {fileName
              ? '누르면 다른 파일로 바꿉니다'
              : accept.includes('svg')
                ? 'SVG 를 권합니다 — 확대해도 흐려지지 않습니다'
                : ' '}
          </span>
        </span>

        <input
          id={id}
          type="file"
          accept={accept}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={msgId}
          onChange={(e) => {
            take(e.target.files)
            // ⚠️ **같은 파일을 다시 고를 수 있게 비운다.** 값이 남아 있으면 브라우저가
            //    "안 바뀌었다" 며 `change` 를 안 쏘고, 지웠다가 되돌리는 흐름이 막힌다.
            e.target.value = ''
          }}
          className={css({
            position: 'absolute',
            inset: '0',
            width: 'full',
            height: 'full',
            opacity: '0',
            cursor: 'pointer',
            // Safari 는 파일 입력의 기본 크기를 넘겨받지 않아 `inset` 만으로는 안 퍼진다.
            fontSize: '0',
          })}
        />
      </div>

      {onClear && fileName && (
        <button
          type="button"
          onClick={onClear}
          className={css({
            mt: '7px',
            appearance: 'none',
            border: '0',
            bg: 'transparent',
            p: '0',
            font: 'inherit',
            textStyle: 'micro',
            fontWeight: '700',
            color: 'faint',
            cursor: 'pointer',
            _hover: { color: 'rFg' },
          })}
        >
          지우기
        </button>
      )}

      {error ? (
        <p id={msgId} className={css({ m: '6px 0 0', textStyle: 'micro', color: 'rFg' })}>
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className={css({ m: '6px 0 0', textStyle: 'micro', color: 'faint' })}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function UploadIcon() {
  return (
    <span
      aria-hidden="true"
      className={css({
        flex: 'none',
        width: '38px',
        height: '38px',
        borderRadius: 'md',
        bg: 'prev',
        color: 'faint2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <svg width="17" height="17" viewBox="0 0 16 16">
        <path
          d="M8,11 V3 M4.8,6.2 L8,3 L11.2,6.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M2.6,10.6 V12.4 A1,1 0 0,0 3.6,13.4 H12.4 A1,1 0 0,0 13.4,12.4 V10.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
