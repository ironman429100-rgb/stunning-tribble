/**
 * Pages Functions 런타임 환경 타입.
 *
 * Cloudflare 가 모든 onRequest* 핸들러에 `context.env` 로 주입한다.
 * binding 은 wrangler.toml 의 [[r2_buckets]] / [[queues.*]] 와 1:1.
 * secret 은 CF Pages 대시보드 Variables and Secrets 에 Type=Secret 으로 등록.
 *
 * 새 환경변수 추가 시:
 *   1) wrangler.toml 또는 CF 대시보드 등록
 *   2) 본 인터페이스에 필드 추가
 *   3) requireEnv() 가 자동으로 누락 시 throw
 */
export interface Env {
  // ── R2 (binding) ──
  IMAGES_BUCKET: R2Bucket;

  // ── Vars (wrangler.toml [vars] 또는 대시보드 Plaintext) ──
  /** R2 공개 URL 호스트. 예: 'https://pub-xxxxxx.r2.dev' (끝 슬래시 없음). */
  R2_PUBLIC_HOST: string;

  // ── Supabase (대시보드 Secrets/Plaintext) ──
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  /** Service-role 권한, RLS bypass. 절대 응답 본문에 echo 금지. */
  SUPABASE_SECRET_KEY: string;

  // ── OpenAI (대시보드 Secret) ──
  OPENAI_API_KEY: string;

  // ── Polar (Sprint 3 에서 사용) ──
  POLAR_SECRET?: string;
  POLAR_WEBHOOK_SECRET?: string;

  // ── Cloudflare Browser Rendering (Sprint 2 에서 사용) ──
  CF_BROWSER_RENDERING_TOKEN?: string;
}

/**
 * 필수 환경변수가 비어있으면 즉시 throw.
 * Pages Functions 핸들러 첫 줄에서 호출해 fail-fast.
 *
 * 빈 문자열도 누락으로 간주 — 대시보드에서 변수만 만들고 값 안 넣은 케이스 방지.
 */
export function requireEnv<K extends keyof Env>(env: Env, key: K): NonNullable<Env[K]> {
  const v = env[key];
  if (v === undefined || v === null || v === '') {
    throw new Error(
      `[env] ${String(key)} 누락. wrangler.toml 또는 CF Pages Variables and Secrets 확인.`,
    );
  }
  return v as NonNullable<Env[K]>;
}
