/**
 * 에셋 파사드 — 아이템·배경·업적이 함께 쓴다.
 *
 * 원래 `api/items.ts` 안에 있었는데, 배경과 업적도 같은 카탈로그를 쓰므로 꺼냈다.
 * 슬롯이 아니라 **종류(`AssetKind`)** 로 받는 것이 그 결과다.
 */
import { useMutation, useQuery } from '@tanstack/react-query'

import { validateAssetFile, ASSET_SPECS, type Asset, type AssetKind } from '@/domain/asset'

import { addAsset, assetsOf } from '@/mocks/assets'

import { qk, queryClient, USE_MOCK } from './core'
import { apiError } from './error'

export async function getAssets(kind: AssetKind): Promise<Asset[]> {
  if (USE_MOCK) {
    // 정적 목록이라 기다릴 것이 없다 — `mockDelay` 를 넣으면 고르기 창만 늦게 뜬다.
    return assetsOf(kind)
  }

  // TODO(에셋 카탈로그 API 가 생기면): http.get<Asset[]>('/admin/assets', { params: { kind } })
  throw new Error('에셋 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useAssets(kind: AssetKind) {
  return useQuery({ queryKey: qk.assets.list(kind), queryFn: () => getAssets(kind) })
}

export type UploadAssetVars = {
  kind: AssetKind
  file: File
  /** 카탈로그에 보일 이름. 보통 아이템명을 그대로 쓴다 */
  name: string
  sub?: string
}

/**
 * 파일을 올려 카탈로그에 넣는다.
 *
 * ⚠️ **부르는 시점이 중요하다.** 파일을 고르는 순간이 아니라 **저장할 때** 부른다 —
 *    고르자마자 올리면 등록을 그만둔 사람의 그림이 서버에 남는다(`/security` 에서
 *    시크릿을 버튼 누른 순간에만 발급하는 것과 같은 이유).
 *
 * ⚠️ **SVG 는 스크립트를 품을 수 있다.** 우리는 `<img src>` 로만 그리므로 이미지
 *    컨텍스트에서 스크립트가 실행되지 않아 목 단계에서는 안전하다.
 *    TODO(에셋 업로드 API 가 생기면): 서버가 받을 때 sanitize 해야 한다. 그리고
 *    이미지와 본문을 **한 multipart 요청**으로 묶어야 한다 — 지금처럼 둘로 나누면
 *    업로드만 성공하고 본문 저장이 실패했을 때 주인 없는 그림이 남는다.
 */
export async function uploadAsset({ kind, file, name, sub }: UploadAssetVars): Promise<Asset> {
  // 화면이 이미 검사하지만 여기서도 본다 — 파사드는 화면 하나만의 것이 아니다.
  const invalid = validateAssetFile(file, ASSET_SPECS[kind])
  if (invalid) throw apiError('http', invalid, 400)

  if (USE_MOCK) {
    // ⚠️ **해제하지 않는다.** 카탈로그가 이 URL 을 계속 들고 있어서, 해제하면
    //    이미 그려진 `<img>` 가 깨진다. 문서가 닫힐 때 브라우저가 정리한다.
    const src = URL.createObjectURL(file)
    return addAsset(kind, { name, sub: sub ?? '방금 올린 파일', src })
  }

  // TODO(에셋 업로드 API 가 생기면): FormData 로 multipart POST
  throw new Error('에셋 업로드 API 가 아직 연결되지 않았습니다. VITE_USE_MOCK=1 로 두세요.')
}

export function useUploadAsset() {
  return useMutation({
    mutationFn: uploadAsset,
    // 카탈로그가 바뀌었으니 고르기 창이 다시 읽게 한다.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.assets.all }),
  })
}
