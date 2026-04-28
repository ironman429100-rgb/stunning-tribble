# Fashion SaaS

## Stack

- React 19 + Vite 8 + TypeScript (no Next.js)
- Cloudflare Pages + Pages Functions + Queues + R2
- Supabase (Postgres + Auth)
- OpenAI Images 2.0 (gpt-image-2): Standard $0.04, HD $0.08
- OpenAI GPT-4o-mini for text
- Polar.sh for payments
- npm only (no bun/pnpm)

## Principles

- 혁신 토큰 3개만: AI 라우팅 / BANNED-RISK / 한국 매칭 로직
- 그 외 전부 검증된 지루한 도구
- API 키는 `functions/api/` 서버리스에서만 (절대 프론트 X)
- 어댑터 패턴: `ImageProvider` 인터페이스로 모델 교체 용이성 유지
- 모든 기능에 Happy / Nil / Empty / Error 4경로 처리

## NOT in scope (v1)

- 자동 업로드 (에이블리/지그재그)
- 다중 모델 프리셋 동시 운용
- 코디셋 자동 합성
- 광고 영상화
- 자사몰 빌더

## Commands

- `npm run dev` — 로컬 서버 (localhost:5173)
- `npm run build` — 빌드
- `npm run typecheck` — 타입 체크
- `wrangler pages deploy dist` — 수동 배포
- `npx supabase db push` — 스키마 마이그레이션

## Environment Variables (`functions/api/` 에서만 사용)

- `OPENAI_API_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (프론트 OK), `SUPABASE_SERVICE_KEY` (서버만)
- `POLAR_SECRET`, `POLAR_WEBHOOK_SECRET`
- `CF_BROWSER_RENDERING_TOKEN`

## Production URL

- URL: https://stunning-tribble-1o3.pages.dev
- Auto-deploy: main branch (Cloudflare Pages → GitHub `ironman429100-rgb/stunning-tribble`)
- Compatibility flag: `nodejs_compat` (compatibility date 2026-04-27)
- Node version: 20

## Sprint Status

- [x] Sprint 0 — 셋업
- [ ] Sprint 1 — 뼈대 (Day 1-3)
  - [x] Day 1 — 폴더 구조 + 라우팅 골격 (commit `6adf760`)
  - [ ] Day 2 — 인프라 연동 + 핵심 타입 + 공통 컴포넌트
  - [ ] Day 3 — Supabase + R2 + OpenAI Images 2.0 PoC
- [ ] Sprint 2 — 핵심 기능 (Day 4-10)
- [ ] Sprint 3 — 인증/결제/상세 (Day 11-17)
- [ ] Sprint 4 — 베타 (Day 18-28)
