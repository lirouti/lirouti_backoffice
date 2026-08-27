import { css } from 'styled-system/css'

import { pct } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Card, CardTitle } from '@/shared/ui/Card'
import { ProgressBar } from '@/shared/ui/ProgressBar'

import { CHALLENGE_KIND_LABEL, CHALLENGE_KIND_TONE, type Challenge } from '@/domain/challenge'

export function LiveChallengesCard({ challenges }: { challenges: Challenge[] }) {
  return (
    <Card className={css({ flex: '1 1 460px', p: '17px 19px 19px' })}>
      <CardTitle title="진행 중 챌린지 달성률" />
      <div className={css({ display: 'flex', flexDirection: 'column', gap: '11px', mt: '13px' })}>
        {challenges.map((c) => (
          <div key={c.key}>
            <div className={css({ display: 'flex', alignItems: 'baseline', gap: '8px', mb: '5px' })}>
              <Badge tone={CHALLENGE_KIND_TONE[c.kind]}>{CHALLENGE_KIND_LABEL[c.kind]}</Badge>
              <span
                className={css({ flex: '1', textStyle: 'label', fontWeight: '600', color: 'ink' })}
              >
                {c.title}
              </span>
              <span className={css({ textStyle: 'label', fontWeight: '700', color: 'sub' })}>
                {pct(c.rate)}
              </span>
            </div>
            <ProgressBar rate={c.rate} label={`${c.title} 달성률`} />
          </div>
        ))}
      </div>
    </Card>
  )
}
