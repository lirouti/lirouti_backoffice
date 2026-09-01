/**
 * 원화 추출 규칙 (docs/ARCHITECTURE.md §8.6).
 *
 * 여기서 잡으려는 것은 **조용한 고장**뿐이다 — 빈 에셋, 겹쳐 그려진 그림, 검게 칠해진
 * 자리. 전부 빌드를 통과하고 화면에서야 드러나는 것들이라, 던지는 쪽이 맞다.
 */
import { describe, expect, it } from 'vitest'

import { assertResolved, foldIf, jsTable, sliceBetween, subst } from './asset-rules'

const iff = (name: string, inner: string) => `<sc-if value="{{ ${name} }}">${inner}</sc-if>`

describe('foldIf', () => {
  it('참인 가지는 내용만 남긴다', () => {
    expect(foldIf(iff('on', '<rect/>'), { on: true })).toBe('<rect/>')
  })

  // 남기면 16개 배경이 한 그림에 겹쳐 그려진다.
  it('⚠️ 거짓인 가지는 내용째 지운다', () => {
    expect(foldIf(iff('on', '<rect/>'), { on: false })).toBe('')
  })

  // 원본 엔진이 그렇게 동작한다 — 안 넘긴 prop(`bgOn`)이 그대로 거짓이 된다.
  it('없는 이름은 거짓으로 본다', () => {
    expect(foldIf(iff('nope', '<rect/>'), {})).toBe('')
  })

  // 게으른 정규식이면 **첫 번째 닫는 태그에서 끊겨** 보금자리의 걸이등·화분이 사라진다.
  it('⚠️ 중첩된 분기의 짝을 맞춘다', () => {
    const tpl = iff('outer', `<a/>${iff('inner', '<b/>')}<c/>`)
    expect(foldIf(tpl, { outer: true, inner: true })).toBe('<a/><b/><c/>')
    expect(foldIf(tpl, { outer: true, inner: false })).toBe('<a/><c/>')
    // 바깥이 거짓이면 안쪽 값과 무관하게 통째로 사라진다
    expect(foldIf(tpl, { outer: false, inner: true })).toBe('')
  })

  it('나란히 놓인 분기를 각각 판단한다', () => {
    const tpl = iff('a', '<a/>') + iff('b', '<b/>') + iff('c', '<c/>')
    expect(foldIf(tpl, { a: true, b: false, c: true })).toBe('<a/><c/>')
  })

  // 원본이 `<sc-if value="{{ x }}" hint-placeholder-val="{{ false }}">` 로 쓴다.
  it('여는 태그의 다른 속성에 속지 않는다', () => {
    const tpl = '<sc-if value="{{ on }}" hint-placeholder-val="{{ false }}"><rect/></sc-if>'
    expect(foldIf(tpl, { on: true })).toBe('<rect/>')
  })

  // 참·거짓만 남긴다 — 문자열 'false' 나 0 을 참으로 읽으면 안 그릴 것이 그려진다.
  it('⚠️ 참인 값만 참이다 (truthy 가 아니라)', () => {
    expect(foldIf(iff('on', '<rect/>'), { on: 'true' })).toBe('')
    expect(foldIf(iff('on', '<rect/>'), { on: 1 })).toBe('')
  })

  it('닫히지 않으면 던진다', () => {
    expect(() => foldIf('<sc-if value="{{ on }}"><rect/>', { on: true })).toThrow('닫히지 않은')
  })
})

describe('subst', () => {
  it('값을 꽂는다', () => {
    expect(subst('<rect fill="{{ c }}"/>', { c: '#F3EBE1' })).toBe('<rect fill="#F3EBE1"/>')
  })

  it('같은 이름이 여러 번 나와도 전부 바꾼다', () => {
    expect(subst('{{ c }}|{{ c }}', { c: 'x' })).toBe('x|x')
  })

  // 빈 문자열로 두면 `fill=""` 가 되어 **검게 칠해진 채로** 파일이 나온다.
  it('⚠️ 없는 이름은 던진다', () => {
    expect(() => subst('<rect fill="{{ c }}"/>', {})).toThrow('{{ c }}')
  })

  // 값이 빈 문자열인 것은 정상이다 — `nestD` 처럼 "이 티어엔 없음"을 그렇게 표현한다.
  it('값이 빈 문자열인 것은 없는 것과 다르다', () => {
    expect(subst('<path d="{{ d }}"/>', { d: '' })).toBe('<path d=""/>')
  })
})

describe('sliceBetween', () => {
  it('시작 표지부터 끝 표지 직전까지 자른다', () => {
    expect(sliceBetween('..<A>가운데<B>..', '<A>', '<B>')).toBe('<A>가운데')
  })

  // 빈 문자열로 넘어가면 0바이트 에셋이 나오는데, 그건 `?` 보다 나쁘다.
  it('⚠️ 표지를 못 찾으면 던진다', () => {
    expect(() => sliceBetween('..<A>..', '<A>', '<없음>')).toThrow('끝 표지')
    expect(() => sliceBetween('..<B>..', '<없음>', '<B>')).toThrow('시작 표지')
  })

  // 원본이 바뀌어 순서가 뒤집히면 음수 길이가 아니라 빈 문자열이 나온다 — 위와 같은 고장.
  it('⚠️ 순서가 뒤집히면 던진다', () => {
    expect(() => sliceBetween('..<B>..<A>..', '<A>', '<B>')).toThrow('뒤집')
  })
})

describe('jsTable', () => {
  // 원본 `SCENE` 과 `NEST` 의 실제 모양. 키 표기가 서로 다르다.
  const js = `
    const SCENE = {
      studio:  ['#F3EBE1', '#E2D2B2'],
      night:   ['#2B3358', '#3F4A7A']
    };
    const NEST = {
      '1': ['M18,478 …', '#C9A063', '#A87C4E'],
      '2': ['M112,478 …', '#BC9256', '#8E6B44']
    };
  `

  it('맨 키와 따옴표 키를 모두 읽는다', () => {
    expect(jsTable(js, 'SCENE', 2).studio).toEqual(['#F3EBE1', '#E2D2B2'])
    expect(jsTable(js, 'NEST', 3)['1']).toEqual(['M18,478 …', '#C9A063', '#A87C4E'])
  })

  it('표를 이름으로 골라 읽는다 — 뒤의 표에 새지 않는다', () => {
    expect(Object.keys(jsTable(js, 'SCENE', 2))).toEqual(['studio', 'night'])
  })

  // 원본에 `]` 를 품은 문자열이 생기면 값 목록이 잘리는데, 그때 개수로 걸린다.
  it('⚠️ 값 개수가 다르면 던진다', () => {
    expect(() => jsTable(js, 'SCENE', 3)).toThrow('2개입니다')
  })

  // 첫 `}` 에서 멈추면 **중첩 블록 뒤의 줄을 통째로 잃는다.** 지금 두 표에는 중첩이 없지만,
  // 다른 표를 가리키는 순간 조용히 일부만 읽히므로 깊이를 센다.
  it('⚠️ 중첩된 중괄호를 지나 표 끝까지 읽는다', () => {
    const nested = "const T = { a: ['x'], meta: { z: 1 }, b: ['y'] };"
    expect(Object.keys(jsTable(nested, 'T', 1))).toEqual(['a', 'b'])
  })

  it('없는 표 · 빈 표 · 안 닫힌 표는 던진다', () => {
    expect(() => jsTable(js, 'NOPE', 2)).toThrow('찾지 못했습니다')
    expect(() => jsTable('const E = {};', 'E', 2)).toThrow('비었습니다')
    expect(() => jsTable("const U = { a: ['x'] ", 'U', 1)).toThrow('닫히지 않은')
  })
})

describe('assertResolved', () => {
  it('다 접힌 마크업은 통과시킨다', () => {
    expect(() => assertResolved('<rect fill="#fff"/>', 'bg_0')).not.toThrow()
  })

  it('⚠️ 남은 자리표시자를 잡는다', () => {
    expect(() => assertResolved('<rect fill="{{ c }}"/>', 'bg_0')).toThrow('bg_0')
  })

  // 우리가 처리하지 않는 지시자가 새 원본에 들어오면 문자열로 박혀 아무것도 안 그린다.
  it('⚠️ sc-if 말고 다른 지시자도 잡는다', () => {
    expect(() => assertResolved('<sc-for list="x"></sc-for>', 'bg_0')).toThrow()
    expect(() => assertResolved('<sc-if value="x"></sc-if>', 'bg_0')).toThrow()
  })

  // `foldIf` 는 **여는 태그 기준**이라 짝 없는 닫는 태그를 그냥 남긴다. 구간 경계가 바깥 분기
  // 안쪽에서 시작하게 바뀌면 실제로 그렇게 되고, 여는 쪽만 보면 SVG 안으로 그대로 나간다.
  it('⚠️ 짝 없는 닫는 태그를 잡는다', () => {
    expect(foldIf('<sc-if value="{{ on }}"><rect/></sc-if></sc-if>', { on: true })).toBe(
      '<rect/></sc-if>',
    )
    expect(() => assertResolved('<rect/></sc-if>', 'as_nest_0')).toThrow('as_nest_0')
  })
})

