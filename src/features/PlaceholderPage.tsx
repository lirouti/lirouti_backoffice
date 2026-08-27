import { css } from 'styled-system/css'

import { Card } from '@/shared/ui/Card'

import { SCREENS, type ScreenId } from '@/domain/screens'

/**
 * 아직 포팅하지 않은 화면. 라우트와 탭·브레드크럼은 살아 있고 본문만 비어 있다.
 *
 * 각 화면의 디자인은 Claude Design "리루티" 프로젝트의 형제 파일
 * (`riruti-admin-items.dc.html` 등)에 있다. 착수 시 DesignSync 로 받아 대조한다.
 */
export function PlaceholderPage({ screen }: { screen: ScreenId }) {
  return (
    <>
      <h2 className={css({ m: '0 0 18px', textStyle: 'h2', color: 'ink' })}>
        {SCREENS[screen].label}
      </h2>
      <Card className={css({ p: '48px 24px', textAlign: 'center' })}>
        <div className={css({ textStyle: 'body', color: 'sub' })}>아직 구현되지 않은 화면입니다.</div>
        <div className={css({ mt: '6px', textStyle: 'caption', color: 'faint' })}>
          {SCREENS[screen].path} · scope: {SCREENS[screen].scope}
        </div>
      </Card>
    </>
  )
}
