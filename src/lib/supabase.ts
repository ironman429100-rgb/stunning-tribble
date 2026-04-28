/**
 * Supabase 프론트엔드 클라이언트.
 *
 * 새 API 키 형식 사용 (sb_publishable_*).
 * - publishable key는 RLS로 보호되는 공개 키 → 번들에 포함 OK.
 * - secret key (sb_secret_*) 는 절대 이 파일에서 import 금지.
 *   서버 전용은 functions/api/_lib/supabase-server.ts 로 분리 (Day 3 오후).
 *
 * v1: 단일 클라이언트 인스턴스. 인증은 Sprint 3 에서 Auth UI 붙이며 활성화.
 * v2: 멀티 워크스페이스 시 클라이언트 풀 검토.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (typeof url !== 'string' || url.length === 0) {
  throw new Error(
    '[supabase] VITE_SUPABASE_URL 누락. .env.local 또는 Cloudflare Pages 환경변수 확인.',
  );
}
if (typeof publishableKey !== 'string' || publishableKey.length === 0) {
  throw new Error(
    '[supabase] VITE_SUPABASE_PUBLISHABLE_KEY 누락. .env.local 또는 Cloudflare Pages 환경변수 확인.',
  );
}

/**
 * 싱글톤 클라이언트.
 * Auth 세션은 localStorage에 자동 저장됨 (기본값).
 * v1: 기본 옵션. v2: 인증 자동 새로고침/멀티탭 동기화 옵션 검토.
 */
export const supabase: SupabaseClient = createClient(url, publishableKey);
