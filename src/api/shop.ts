/**
 * 재화 · 상점 파사드.
 *
 * **진열은 아이템을 가리키기만 한다.** 여기서 아이템과 합쳐 화면에 줄 모양을 만든다 —
 * 이름·가격을 진열 쪽에 복사해 두면 아이템을 고쳤을 때 상점만 옛 값을 들고 있게 된다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import type { Item } from '@/domain/item'
import { summarizeGems, type GemProduct, type GemSummary, type ShopSlot } from '@/domain/shop'

import { allItems } from '@/mocks/items'
import { allGemProducts, allShopSlots, resetShopSlots, saveShopSlots } from '@/mocks/shop'

import { mockDelay, qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export type GemsResult = {
  products: GemProduct[]
  summary: GemSummary
}

export async function getGems(): Promise<GemsResult> {
  if (USE_MOCK) {
    await mockDelay()
    const products = allGemProducts()
    return { products, summary: summarizeGems(products) }
  }

  throw new Error('상점 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useGems() {
  return useQuery({ queryKey: qk.shop.gems(), queryFn: getGems })
}

/** 진열 한 칸 + 그 자리에 놓인 아이템 */
export type ShopEntry = { slot: ShopSlot; item: Item }

export async function getShopSlots(): Promise<ShopEntry[]> {
  if (USE_MOCK) {
    await mockDelay()
    const items = allItems()
    // 아이템이 지워진 자리는 버린다 — 빈 칸을 그리면 운영자가 고칠 방법이 없다.
    return allShopSlots().flatMap((slot) => {
      const item = items.find((it) => it.key === slot.itemKey)
      return item ? [{ slot, item }] : []
    })
  }

  throw new Error('상점 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useShopSlots() {
  return useQuery({ queryKey: qk.shop.slots(), queryFn: getShopSlots })
}

/**
 * 진열 순서를 저장한다.
 *
 * ⚠️ **순서 전체를 보낸다.** "3번을 2번으로" 같은 상대 명령은 그사이 남이 바꿨을 때
 *    엉뚱한 자리로 간다.
 */
export async function saveShop(slots: ShopSlot[]): Promise<ShopSlot[]> {
  if (USE_MOCK) {
    await mockDelay()
    if (slots.length === 0) throw apiError('http', '진열이 비어 있습니다.', 400)
    return saveShopSlots(slots)
  }

  throw new Error('상점 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useSaveShop() {
  return useMutation({
    mutationFn: saveShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.shop.all }),
  })
}

export async function resetShop(): Promise<ShopSlot[]> {
  if (USE_MOCK) {
    await mockDelay()
    return resetShopSlots()
  }

  throw new Error('상점 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useResetShop() {
  return useMutation({
    mutationFn: resetShop,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.shop.all }),
  })
}
