-- Fashion SaaS 초기 스키마
-- Sprint 1 Day 3
--
-- 원칙:
-- 1) Supabase auth.users 를 진실 원천으로 사용. 별도 users 테이블 비유지.
--    필요한 사용자 메타는 public.user_profiles 로 분리 (v2에서 추가 검토).
-- 2) 모든 도메인 테이블은 user_id 컬럼 + RLS 정책으로 격리.
--    publishable key 만으로는 본인 데이터만 select/insert/update/delete 가능.
-- 3) JSONB 컬럼은 src/types/*.ts 인터페이스와 1:1 매핑.
--    스키마 변경 시 타입 파일 함께 수정 필수.

-- ─────────────────────────────────────────────────────────────
-- model_presets
-- 사용자가 등록한 가상 모델 프리셋. SKU 생성 시 reference로 사용.
-- src/types/model-preset.ts ModelPreset 와 1:1.
-- ─────────────────────────────────────────────────────────────
create table public.model_presets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  gender          text not null check (gender in ('female', 'male', 'unisex')),
  -- string[] (R2 URL 목록). 길이 1~5 권장이지만 DB 레벨 제약은 없음.
  reference_images jsonb not null default '[]'::jsonb,
  -- ModelPreset.metadata 와 동일 구조 (appearanceNotes, defaultPoseTemplateId).
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index model_presets_user_id_idx on public.model_presets (user_id);

-- ─────────────────────────────────────────────────────────────
-- skus
-- SKU 1건 = 도매 상품 1건 → 모델샷 6컷 + 상세 1장 묶음.
-- src/types/sku.ts Sku 와 1:1.
-- ─────────────────────────────────────────────────────────────
create table public.skus (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  source_url      text not null,
  source_platform text not null check (source_platform in ('sinsangmarket', 'unknown')),
  product_name    text,
  -- SKU 라이프사이클 5단계:
  --   draft       URL 입력만 됨, 아직 생성 큐에 안 올림
  --   queued      Cloudflare Queues 에 enqueue 됨, OpenAI 호출 대기
  --   generating  OpenAI Images 호출 진행 중 (6컷 + 상세 1장)
  --   ready       모든 이미지 R2 저장 완료, 다운로드/발행 가능
  --   error       콘텐츠 정책 거부 / 일관성 실패 / 비용 초과 / 타임아웃 등
  -- 전이: draft → queued → generating → ready
  --       어떤 단계에서든 → error 가능
  status          text not null check (status in ('draft', 'queued', 'generating', 'ready', 'error'))
                    default 'draft',
  -- string[] (R2 URL 목록). 0~7개. index 0~5 = 모델샷, 6 = 상세.
  generated_images jsonb not null default '[]'::jsonb,
  -- MarginCalculation 객체 또는 null.
  margin_calc     jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index skus_user_id_idx on public.skus (user_id);
create index skus_status_idx  on public.skus (status);

-- ─────────────────────────────────────────────────────────────
-- updated_at 자동 갱신 트리거
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger model_presets_set_updated_at
  before update on public.model_presets
  for each row execute function public.set_updated_at();

create trigger skus_set_updated_at
  before update on public.skus
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- publishable key 환경에서는 RLS 가 유일한 데이터 격리 수단.
-- 모든 도메인 테이블에 RLS enable + auth.uid() = user_id 정책 적용.
-- ─────────────────────────────────────────────────────────────
alter table public.model_presets enable row level security;
alter table public.skus           enable row level security;

create policy "model_presets: owner can select"
  on public.model_presets for select
  using (auth.uid() = user_id);

create policy "model_presets: owner can insert"
  on public.model_presets for insert
  with check (auth.uid() = user_id);

create policy "model_presets: owner can update"
  on public.model_presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "model_presets: owner can delete"
  on public.model_presets for delete
  using (auth.uid() = user_id);

create policy "skus: owner can select"
  on public.skus for select
  using (auth.uid() = user_id);

create policy "skus: owner can insert"
  on public.skus for insert
  with check (auth.uid() = user_id);

create policy "skus: owner can update"
  on public.skus for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skus: owner can delete"
  on public.skus for delete
  using (auth.uid() = user_id);

-- 끝.
-- 다음 마이그레이션 후보 (v2 또는 Sprint 2):
--   - public.user_profiles (멤버십 등급, 프리셋 슬롯 수 등)
--   - public.crawl_cache (도매처 크롤링 결과 캐시)
--   - public.risk_evaluations (BANNED-RISK 평가 이력)
