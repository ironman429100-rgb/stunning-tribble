/**
 * 서버 전용 Supabase 클라이언트.
 *
 * SECRET key 사용 → RLS bypass 가능. 절대 src/ (프론트) 에서 import 금지.
 * Pages Functions 핸들러 안에서만 쓸 것.
 *
 * 사용 패턴:
 *   const supa = createServerClient(env);
 *   const { data, error } = await supa.from('skus').select('*').eq('id', id).single();
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv, type Env } from './env';

/**
 * 요청 단위로 새 클라이언트 생성.
 * Pages Functions 는 isolate per-request 모델이라 모듈 레벨 싱글톤 위험.
 */
export function createServerClient(env: Env): SupabaseClient {
  const url = requireEnv(env, 'SUPABASE_URL');
  const secret = requireEnv(env, 'SUPABASE_SECRET_KEY');

  return createClient(url, secret, {
    auth: {
      // 서버에서는 세션 영속화/자동 새로고침 불필요.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
