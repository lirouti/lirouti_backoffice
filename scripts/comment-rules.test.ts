/**
 * 주석 검사기 픽스처. (docs/ARCHITECTURE.md §17)
 *
 * 실제로 났던 오탐·누락을 그대로 줄로 박아 둔다 — 검사기 자체가
 * 코드를 읽는 코드라 "고쳤다"를 눈으로 확인할 방법이 없다.
 */
import { describe, expect, it } from 'vitest'

import { checkLines, hasBareTodo, scanLine, START } from './comment-rules'

/** 규약을 다 지킨 파일 머리말. 픽스처마다 ①·④에 걸리지 않게 앞에 붙인다. */
const HEAD = ['/** 픽스처. docs/ARCHITECTURE.md §17 */', '']

const check = (...body: string[]) => checkLines([...HEAD, ...body])

describe('scanLine — 주석만 떼어낸다', () => {
  it('문자열 안의 `//` 는 주석이 아니다', () => {
    expect(scanLine(`const a = 'http://x'`, START).comment).toBeNull()
    expect(scanLine(`const a = "TODO: 문자열"`, START).comment).toBeNull()
  })

  it('코드 뒤에 붙은 주석은 그 뒤만', () => {
    expect(scanLine(`const a = 1 // 설명`, START).comment).toBe('// 설명')
  })

  it('템플릿 리터럴은 여러 줄에 걸쳐 열려 있다', () => {
    const open = scanLine('const t = `', START)
    expect(open.next.tpl).toBe(true)
    // 열린 채로 넘어온 줄의 `//` 는 문자열이다
    const inside = scanLine('// TODO: 템플릿 안', open.next)
    expect(inside.comment).toBeNull()
    expect(scanLine('`', inside.next).next.tpl).toBe(false)
  })

  it('블록 주석도 여러 줄에 걸쳐 열려 있다', () => {
    const open = scanLine('/**', START)
    expect(open.next.blk).toBe(true)
    expect(scanLine(' * TODO: 블록 안', open.next).comment).toContain('TODO')
  })

  it('한 줄에서 열고 닫는 블록 주석', () => {
    // `/**` 는 `/*` 로 열리고 남는 `*` 가 본문에 들어간다 — 이어지는 줄의 `*` 와 같다
    const r = scanLine('/** 설명 */ const a = 1', START)
    expect(r.comment).toBe('* 설명 ')
    expect(r.next.blk).toBe(false)
  })
})

describe('hasBareTodo — 토큰마다 본다', () => {
  it('조건이 붙으면 통과', () => {
    expect(hasBareTodo('// TODO(백엔드 스펙 확정 후): 붙인다')).toBe(false)
  })

  it('조건이 없으면 걸린다', () => {
    expect(hasBareTodo('// TODO: 나중에')).toBe(true)
  })

  it('뒤의 것이 올발라도 앞의 것을 놓치지 않는다', () => {
    expect(hasBareTodo('// TODO: 급함; TODO(스펙 확정 후): 나중')).toBe(true)
  })
})

describe('checkLines', () => {
  it('머리말이 없으면 ①', () => {
    expect(checkLines(['export const a = 1'])[0]?.why).toContain('설명이 없습니다')
  })

  it('첫 문서 참조가 경로 없이 §만이면 ④', () => {
    const [issue] = checkLines(['/** 픽스처. §17 만 있다 */', 'export const a = 1'])
    expect(issue?.why).toContain('전체 경로')
  })

  it('최상위 선언 위의 `//` 는 ②', () => {
    expect(check('// 설명', 'export const a = 1')[0]?.why).toContain('hover')
  })

  it('타입 필드 위의 `//` 도 ②', () => {
    expect(check('type X = {', '  // 설명', '  a: string', '}')[0]?.why).toContain('hover')
  })

  it('interface 필드 위의 `//` 도 ② — 선언 병합용 .d.ts 도 검사 대상이다', () => {
    expect(check('interface X {', '  // 설명', '  a: string', '}')[0]?.why).toContain('hover')
  })

  it('프라그마는 JSDoc 으로 바꾸면 동작하지 않으므로 봐준다', () => {
    expect(check('// eslint-disable-next-line no-console', 'export const a = 1')).toEqual([])
  })

  it('함수 본문 안의 `//` 는 대상이 아니다', () => {
    expect(
      check('export function f() {', '  // 왜 이렇게 했는지', '  const a = 1', '}'),
    ).toEqual([])
  })

  it('문자열 리터럴 안의 TODO 는 위반이 아니다', () => {
    expect(check(`export const LABEL = 'TODO: 화면에 뜨는 문구'`)).toEqual([])
  })

  it('템플릿 리터럴 안의 TODO 도 위반이 아니다', () => {
    expect(check('export const T = `', '// TODO: 템플릿 안', '`')).toEqual([])
  })

  it('한 주석에 TODO 가 둘이면 조건 없는 쪽이 걸린다', () => {
    const found = check(
      '/** 설명. TODO: 급함; TODO(스펙 확정 후): 나중 */',
      'export const a = 1',
    )
    expect(found).toHaveLength(1)
    expect(found[0]?.why).toContain('TODO')
  })

  it('규약을 지킨 파일은 조용하다', () => {
    expect(
      check(
        '/** 설명. TODO(백엔드 스펙 확정 후): 붙인다 */',
        'export const a = 1',
        '',
        '/** 필드가 있는 타입 */',
        'export type X = {',
        '  /** 필드 설명 */',
        '  a: string',
        '}',
      ),
    ).toEqual([])
  })
})
