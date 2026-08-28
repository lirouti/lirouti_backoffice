import { useState } from 'react'

import { css } from 'styled-system/css'

import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { EmptyState, Skeleton } from '@/shared/ui/EmptyState'
import { Icon } from '@/shared/ui/Icon'
import { Input } from '@/shared/ui/Input'
import { Segmented } from '@/shared/ui/Segmented'
import { Table, type Column } from '@/shared/ui/Table'

type Row = { code: string; name: string; slot: string; sold: number }

const ROWS: Row[] = [
  { code: 'IT-1001', name: '안경', slot: '얼굴', sold: 3589 },
  { code: 'IT-1002', name: '왕실 벨벳 망토', slot: '몸', sold: 3553 },
  { code: 'IT-1003', name: '산호 티아라', slot: '머리', sold: 3518 },
]

const COLUMNS: Column<Row>[] = [
  { key: 'code', label: '코드', width: '110px', nowrap: true, strong: true },
  { key: 'name', label: '이름', minWidth: '200px', truncate: true },
  { key: 'slot', label: '슬롯', width: '90px' },
  { key: 'sold', label: '판매', width: '100px', align: 'right', render: (r) => r.sold.toLocaleString() },
]

/**
 * 공용 컴포넌트를 한 화면에 모아 눈으로 대조한다.
 *
 * 목록·폼 화면을 만들기 전에 부품이 라이트/다크 양쪽에서 제대로 보이는지 확인할
 * 자리가 필요하다. 여기가 없으면 화면을 만들다가 부품을 고치게 되고, 그러면
 * 이미 만든 화면들이 조용히 틀어진다.
 */
export default function UiKitPage() {
  const [q, setQ] = useState('')
  const [tier, setTier] = useState<'all' | 'free' | 'paid'>('all')

  return (
    <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '1100px' })}>
      <div>
        <h2 className={css({ m: '0', textStyle: 'h2', color: 'ink' })}>UI 컴포넌트</h2>
        <p className={css({ m: '5px 0 0', textStyle: 'body', color: 'sub' })}>
          목록·폼 화면이 쓰는 공용 부품입니다. 라이트·다크 양쪽에서 확인하세요.
        </p>
      </div>

      <Card className={css({ p: '17px 19px' })}>
        <CardTitle title="입력" sub="Input · Segmented" />
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px', mt: '14px', alignItems: 'flex-start' })}>
          <Input
            value={q}
            onChange={setQ}
            label="검색"
            placeholder="아이템 이름"
            hint="이름 부분 일치"
            prefixIcon={
              <svg width="14" height="14" viewBox="0 0 16 16">
                <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
                <path d="M10.4,10.4 L13.5,13.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            }
            className={css({ flex: '1 1 240px' })}
          />
          <Input value="720" onChange={() => undefined} label="가격" suffix="젬" required className={css({ flex: '0 1 180px' })} />
          <Input value="" onChange={() => undefined} label="코드" error="이미 쓰고 있는 코드입니다" className={css({ flex: '0 1 200px' })} />
        </div>
        <div className={css({ mt: '14px' })}>
          <Segmented
            value={tier}
            onChange={setTier}
            aria-label="등급 필터"
            options={[
              { value: 'all', label: '전체' },
              { value: 'free', label: '무료' },
              { value: 'paid', label: '유료' },
            ]}
          />
        </div>
      </Card>

      <Card className={css({ p: '17px 19px' })}>
        <CardTitle title="표" sub="Table — 행을 누르거나 Enter" />
        <Table
          columns={COLUMNS}
          rows={ROWS}
          rowKey={(r) => r.code}
          minWidth={620}
          onRowClick={() => undefined}
          className={css({ mt: '14px' })}
        />
      </Card>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
        <Card className={css({ flex: '1 1 320px', p: '17px 19px' })}>
          <CardTitle title="비었을 때" sub="EmptyState" />
          <EmptyState
            className={css({ mt: '14px', border: '0' })}
            icon={<Icon name="ic_shirt" size={22} />}
            title="결과가 없습니다"
            body="필터를 바꾸거나 검색어를 지워 보세요."
            action={<Button variant="primary">필터 초기화</Button>}
          />
        </Card>
        <Card className={css({ flex: '1 1 320px', p: '17px 19px' })}>
          <CardTitle title="불러오는 중" sub="Skeleton" />
          <Skeleton rows={3} className={css({ mt: '18px' })} />
        </Card>
      </div>

      <Card className={css({ p: '17px 19px' })}>
        <CardTitle title="배지 · 버튼" sub="Badge · Button" />
        <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '8px', mt: '14px', alignItems: 'center' })}>
          <Badge tone="success">노출</Badge>
          <Badge tone="warn">예약</Badge>
          <Badge tone="danger">미노출</Badge>
          <Badge tone="brand">유료</Badge>
          <Badge tone="neutral">무료</Badge>
          <div className={css({ width: '10px' })} />
          <Button variant="primary">주 액션</Button>
          <Button>보조</Button>
          <Button variant="ghost">고스트</Button>
          <Button disabled>비활성</Button>
        </div>
      </Card>
    </div>
  )
}
