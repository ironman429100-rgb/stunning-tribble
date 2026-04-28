/**
 * R2 helper.
 *
 * 책임:
 * - 일관된 key naming (충돌/추측 방지)
 * - public URL 생성 (R2_PUBLIC_HOST 기반)
 * - 업로드 시 Content-Type 강제 (브라우저 인라인 표시용)
 *
 * v1: r2.dev 공개 도메인 사용. 누구나 URL 알면 접근 가능.
 *     보안 가정 = "URL 추측 불가능 (UUID + crypto.randomUUID)" + "URL 노출 = 공개 의도".
 * v2: signed URL 또는 custom domain + Cloudflare Access 룰.
 */
import { requireEnv, type Env } from './env';

/** 객체 종류. key prefix 와 1:1. */
export type R2ObjectKind =
  | 'reference' // 사용자가 업로드한 모델 reference 사진
  | 'shot' // 생성된 모델샷 6컷 중 한 장
  | 'detail' // 생성된 상세페이지
  | 'crawl'; // 도매처 크롤링한 raw 이미지 (Sprint 2)

/**
 * R2 key 빌더. 사용자/리소스/UUID 트라이앵글로 충돌 방지.
 *
 * 형식: {kind}/{userId}/{ownerId}/{uuid}.{ext}
 *   - userId : auth.users.id (소유자)
 *   - ownerId: 어떤 SKU/Preset 에 속하는지 (Sku.id 또는 ModelPreset.id)
 *   - uuid   : 동일 owner 내 충돌 방지용 (crypto.randomUUID())
 *   - ext    : png | jpg | webp (소문자, 점 없이)
 *
 * 예: shot/abc-123/sku-456/9f8e...png
 */
export function buildR2Key(args: {
  kind: R2ObjectKind;
  userId: string;
  ownerId: string;
  ext: 'png' | 'jpg' | 'webp';
}): string {
  const uuid = crypto.randomUUID();
  return `${args.kind}/${args.userId}/${args.ownerId}/${uuid}.${args.ext}`;
}

/**
 * R2 에 byte 업로드. ArrayBuffer 또는 Uint8Array 모두 OK.
 * Content-Type 은 호출측에서 명시 필수 — 브라우저 인라인 표시 위해.
 */
export async function putObject(
  env: Env,
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await env.IMAGES_BUCKET.put(key, body, {
    httpMetadata: { contentType },
  });
}

/**
 * R2 객체의 public URL.
 * `R2_PUBLIC_HOST` 가 빈 값이면 throw — 운영자가 자리만 잡고 값 안 채운 케이스 방지.
 */
export function publicUrl(env: Env, key: string): string {
  const host = requireEnv(env, 'R2_PUBLIC_HOST').replace(/\/+$/, '');
  return `${host}/${key}`;
}
