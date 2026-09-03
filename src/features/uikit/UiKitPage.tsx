import { useState, type ReactNode } from 'react'

import { css } from 'styled-system/css'

import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardTitle } from '@/shared/ui/Card'
import { Dialog } from '@/shared/ui/Dialog'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Icon } from '@/shared/ui/Icon'
import { Input } from '@/shared/ui/Input'
import { PageHeader } from '@/shared/ui/PageHeader'
import { Pagination } from '@/shared/ui/Pagination'
import { Segmented } from '@/shared/ui/Segmented'
import { Select } from '@/shared/ui/Select'
import {
  SkeletonBlock,
  SkeletonCards,
  SkeletonForm,
  SkeletonPage,
  SkeletonRows,
  SkeletonStats,
} from '@/shared/ui/Skeleton'
import { Switch } from '@/shared/ui/Switch'
import { Table, type Column } from '@/shared/ui/Table'

import { useUnsavedGuard } from '@/stores/dirtyStore'

/** `slot` 은 **값**을 담는다. 화면에 보이는 이름은 `SLOT_LABEL` 이 준다. */
type Row = { code: string; name: string; slot: string; sold: number }

/** 표에 보여줄 더미. 부품의 모양만 보는 자리라 목 데이터를 부르지 않는다. */
const ROWS: Row[] = [
  { code: 'IT-1001', name: '안경', slot: 'face', sold: 3589 },
  { code: 'IT-1002', name: '왕실 벨벳 망토', slot: 'body', sold: 3553 },
  { code: 'IT-1003', name: '산호 티아라', slot: 'head', sold: 3518 },
]

const SLOTS = [
  { value: 'head', label: '머리' },
  { value: 'face', label: '얼굴' },
  { value: 'body', label: '몸' },
  { value: 'back', label: '등' },
]

const SLOT_LABEL = Object.fromEntries(SLOTS.map((s) => [s.value, s.label]))

const COLUMNS: Column<Row>[] = [
  { key: 'code', label: '코드', width: '110px', nowrap: true, strong: true },
  { key: 'name', label: '이름', minWidth: '200px', truncate: true },
  { key: 'slot', label: '슬롯', width: '90px', render: (r) => SLOT_LABEL[r.slot] ?? r.slot },
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
  const [slot, setSlot] = useState('')
  const [live, setLive] = useState(true)
  const [autoHide, setAutoHide] = useState(false)
  const [page, setPage] = useState(4)
  const [unsaved, setUnsaved] = useState(false)
  const [ask, setAsk] = useState<'none' | 'default' | 'danger'>('none')

  useUnsavedGuard(unsaved)

  // 안내가 "고르면 목록이 걸러집니다" 라면 실제로 걸러져야 한다.
  // 눌러도 아무 일이 없는 필터는 "이 도구는 고장났다"를 학습시킨다.
  const rows = slot ? ROWS.filter((r) => r.slot === slot) : ROWS

  return (
    <div className={css({ maxWidth: '1100px' })}>
      <PageHeader
        title="UI 컴포넌트"
        sub="목록·폼 화면이 쓰는 공용 부품입니다. 라이트·다크 양쪽에서 확인하세요."
      />

      {/* 머리말은 자기 여백(18px)을 갖는다. gap 은 카드들 사이에만 든다 */}
      <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px' })}>

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
          <Input
            value=""
            onChange={() => undefined}
            label="코드"
            error="이미 쓰고 있는 코드입니다"
            id="uikit-code"
            aria-describedby="uikit-extra"
            className={css({ flex: '0 1 200px' })}
          />
          <span id="uikit-extra" className={css({ srOnly: true })}>
            바깥에서 준 설명
          </span>
          <Select
            value={slot}
            onChange={setSlot}
            label="슬롯"
            placeholder="전체"
            options={SLOTS}
            hint="고르면 목록이 걸러집니다"
            className={css({ flex: '0 1 180px' })}
          />
          <Select
            value=""
            onChange={() => undefined}
            label="등급"
            placeholder="선택하세요"
            options={['일반', '희귀', '전설']}
            error="등급을 골라 주세요"
            required
            className={css({ flex: '0 1 180px' })}
          />
          <Select
            value="body"
            onChange={() => undefined}
            label="고정 슬롯"
            options={SLOTS}
            hint="권한이 없습니다"
            name="fixedSlot"
            disabled
            className={css({ flex: '0 1 180px' })}
          />
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
          rows={rows}
          rowKey={(r) => r.code}
          minWidth={620}
          onRowClick={() => undefined}
          className={css({ mt: '14px' })}
        />
      </Card>

      <Card className={css({ p: '17px 19px' })}>
        {/*
          표와 같은 카드에 두지 않는다 — 위 표는 슬롯 필터로 걸러지는 3행짜리 더미고
          여기 숫자는 384건짜리 가짜다. 붙여 두면 서로 딸린 숫자처럼 읽혀서
          "1행인데 384건 중 61–80" 이 된다.
        */}
        <CardTitle title="페이지 바" sub="Pagination — 옮겨도 폭이 변하지 않는다" />
        <Pagination
          page={page}
          perPage={20}
          totalItems={384}
          onChange={setPage}
          className={css({ mt: '14px' })}
        />
      </Card>

      <div className={css({ display: 'flex', flexWrap: 'wrap', gap: '14px' })}>
        <Card className={css({ flex: '1 1 320px', p: '17px 19px' })}>
          <CardTitle title="스위치" sub="Switch — 즉시 반영되는 설정에만" />
          <div className={css({ display: 'flex', flexDirection: 'column', gap: '14px', mt: '16px' })}>
            <Switch checked={live} onChange={setLive} label="상점 노출" />
            <Switch
              checked={autoHide}
              onChange={setAutoHide}
              label="재고 0 이면 자동 숨김"
              hint="다음 정산 주기부터 적용됩니다"
            />
            <Switch checked={false} onChange={() => undefined} label="비활성" hint="권한이 없습니다" disabled />
            <Switch
              checked={unsaved}
              onChange={setUnsaved}
              label="이 탭을 미저장으로 표시"
              hint="탭에 점(●)이 붙고, 닫으려 하면 확인 창이 뜹니다"
            />
          </div>
        </Card>
        <Card className={css({ flex: '1 1 320px', p: '17px 19px' })}>
          <CardTitle title="확인 창" sub="Dialog — Esc · 바깥 클릭 · 포커스 가둠" />
          <div className={css({ display: 'flex', gap: '8px', mt: '16px' })}>
            <Button onClick={() => setAsk('default')}>기본</Button>
            <Button variant="danger" onClick={() => setAsk('danger')}>
              삭제
            </Button>
          </div>
        </Card>
      </div>

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
          <CardTitle title="불러오는 중" sub="SkeletonRows" />
          <SkeletonRows rows={3} className={css({ mt: '18px' })} />
        </Card>
      </div>

      {/*
        모양이 여럿인 이유는 **들어올 것의 자리를 잡기** 위해서다 — 카드가 올 자리에 목록
        행을 그리면 자리를 잡아 주기는커녕 더 크게 튄다 (docs/ARCHITECTURE.md §43).
        고를 수 있게 한자리에 늘어놓는다.
      */}
      <Card className={css({ p: '17px 19px' })}>
        <CardTitle title="로딩 자리" sub="Skeleton — 모양은 들어올 것을 따른다" />
        <div className={css({ display: 'flex', flexDirection: 'column', gap: '22px', mt: '18px' })}>
          <Demo name="SkeletonStats" note="지표 타일. min 은 그 화면의 minmax 와 같게">
            <SkeletonStats count={4} min={200} />
          </Demo>
          <Demo name="SkeletonCards" note="카드 격자. min 이 다르면 열 수가 달라져 튄다">
            <SkeletonCards count={4} min={190} />
          </Demo>
          <Demo name="SkeletonForm" note="좌 입력 카드 + 우 사이드 카드">
            <SkeletonForm fields={2} />
          </Demo>
          <Demo name="SkeletonBlock" note="차트처럼 흉내 낼 수 없는 것의 자리">
            <SkeletonBlock height={120} />
          </Demo>
          <Demo name="SkeletonPage" note="라우트 폴백 전용 — 어떤 화면이 올지 모른다">
            <SkeletonPage />
          </Demo>
        </div>
      </Card>

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
          <Button variant="danger">삭제</Button>
          <Button variant="ghost">고스트</Button>
          <Button disabled>비활성</Button>
        </div>
      </Card>

      <Dialog
        open={ask === 'default'}
        onCancel={() => setAsk('none')}
        onConfirm={() => setAsk('none')}
        title="변경 사항을 저장할까요?"
        body="지금 저장하면 상점에 바로 반영됩니다."
        confirmLabel="저장"
      />
      <Dialog
        open={ask === 'danger'}
        onCancel={() => setAsk('none')}
        onConfirm={() => setAsk('none')}
        tone="danger"
        title="아이템을 삭제할까요?"
        body="되돌릴 수 없습니다. 보유 중인 이용자의 인벤토리에서도 사라집니다."
        confirmLabel="삭제"
      />
      </div>
    </div>
  )
}

/** UI 킷 안에서만 쓰는 라벨 + 예시 묶음 */
function Demo({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <div>
      <div className={css({ display: 'flex', alignItems: 'baseline', gap: '8px', mb: '10px' })}>
        <code className={css({ fontFamily: 'mono', textStyle: 'caption', color: 'ink' })}>{name}</code>
        <span className={css({ textStyle: 'micro', color: 'faint' })}>{note}</span>
      </div>
      {children}
    </div>
  )
}
