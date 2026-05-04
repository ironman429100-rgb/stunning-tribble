/**
 * Day 3 저녁 PoC — OpenAI Images 2.0 (gpt-image-2) 1회 검증.
 *
 * 목적:
 *   1) 모델 + 옷 묘사 텍스트로 6컷 생성이 콘텐츠 정책에 안 걸리는지
 *   2) prompt-only baseline 으로 얼굴 일관성이 어느 정도인지 (참고치)
 *   3) 옷 디테일 재현 품질
 *   4) 비용이 예상대로 ~$0.24 인지 (6 × $0.04 standard)
 *
 * 검증 결과가 나쁘면 Sprint 2 에서 images.edit + reference image 로 전환.
 * 이 파일은 Sprint 2 시작 시점에 삭제 예정.
 *
 * 호출:
 *   POST https://stunning-tribble-1o3.pages.dev/api/_test/poc-images-2?confirm=1
 *   Content-Type: application/json
 *   { "modelDescription": "...", "clothingDescription": "..." }
 *
 * 비용 보호:
 *   - ?confirm=1 없으면 400. 우연 호출/봇 크롤링 차단.
 *   - $0.24 / 호출. OpenAI Billing 한도 미리 설정 권장.
 */
import type { Env } from '../_lib/env';
import { requireEnv } from '../_lib/env';
import { buildR2Key, putObject, publicUrl } from '../_lib/r2';

interface PocRequestBody {
  /** 모델 외형 묘사. 한글/영문 OK. 짧을수록 일관성↓. */
  modelDescription?: string;
  /** 옷 묘사. 도매처 상품명 + 카테고리 형태 권장. */
  clothingDescription?: string;
}

/** 6컷 표준 포즈. v1: 고정. Sprint 2 에서 PoseTemplate 와 통합. */
const SIX_POSES: ReadonlyArray<string> = [
  'standing front pose, full body, hands relaxed at sides, looking at camera',
  'standing 3/4 view, slight side profile, full body',
  'standing back view, full body, head turned slightly',
  'upper body close-up, focus on clothing texture and fit',
  'walking pose, dynamic stride, full body',
  'seated casual pose, relaxed posture, full body',
];

/** 표준 이미지 크기 (세로형 패션샷). */
const IMAGE_SIZE = '1024x1536';
/** Standard quality 1컷당 단가 (USD). HD = $0.08, Low = $0.011. */
const COST_PER_SHOT_USD = 0.04;

interface OpenAiImageResponse {
  created: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  /** 에러 시 OpenAI 가 채우는 필드. */
  error?: { message: string; type: string; code?: string };
}

interface ShotResult {
  pose: string;
  index: number;
  status: 'ok' | 'failed';
  /** ok 일 때만. R2 public URL. */
  url?: string;
  /** failed 일 때 OpenAI 에러 메시지 + HTTP status. */
  error?: { httpStatus: number; message: string; body: string };
  /** 이 1컷 wall-clock ms. */
  durationMs: number;
}

interface PocResponse {
  /** 호출 전체 시작 ISO. */
  startedAt: string;
  /** 호출 전체 wall-clock ms. */
  totalDurationMs: number;
  /** 6컷 결과. 순서는 SIX_POSES 와 동일. */
  shots: ShotResult[];
  /** ok 컷 수. 6 = 검증 #1 PASS 후보. */
  okCount: number;
  /** 예상 청구 금액 (USD). 실제 OpenAI 청구는 별도 확인 필요. */
  estimatedCostUsd: number;
  /** 사용된 모델 + 크기 + quality. 응답 자기문서화. */
  meta: {
    model: string;
    size: string;
    quality: string;
    promptPattern: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  if (url.searchParams.get('confirm') !== '1') {
    return jsonError(
      400,
      'POC_NO_CONFIRM',
      '비용 보호: ?confirm=1 쿼리스트링 필요. 1회당 ~$0.24 청구됨.',
    );
  }

  let body: PocRequestBody;
  try {
    body = await ctx.request.json<PocRequestBody>();
  } catch {
    body = {};
  }

  const modelDesc =
    body.modelDescription?.trim() ||
    'Korean female fashion model in her 20s, natural makeup, neutral expression, studio lighting, clean white background';
  const clothingDesc =
    body.clothingDescription?.trim() ||
    'oversized beige trench coat with belt, autumn outerwear';

  const apiKey = requireEnv(ctx.env, 'OPENAI_API_KEY');

  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // 6 호출 병렬. Promise.all 이 아닌 allSettled 로 부분 실패도 살리기.
  const settled = await Promise.allSettled(
    SIX_POSES.map((pose, idx) =>
      generateOneShot({
        apiKey,
        env: ctx.env,
        modelDesc,
        clothingDesc,
        pose,
        index: idx,
      }),
    ),
  );

  const shots: ShotResult[] = settled.map((s, idx) => {
    if (s.status === 'fulfilled') return s.value;
    // Promise.allSettled 의 rejected 케이스 — generateOneShot 자체가 throw 한 경우.
    return {
      pose: SIX_POSES[idx]!,
      index: idx,
      status: 'failed' as const,
      error: {
        httpStatus: 0,
        message: 'unhandled exception',
        body: String(s.reason),
      },
      durationMs: 0,
    };
  });

  const okCount = shots.filter((s) => s.status === 'ok').length;
  const totalDurationMs = Date.now() - t0;

  const response: PocResponse = {
    startedAt,
    totalDurationMs,
    shots,
    okCount,
    estimatedCostUsd: okCount * COST_PER_SHOT_USD,
    meta: {
      model: 'gpt-image-2',
      size: IMAGE_SIZE,
      quality: 'standard',
      promptPattern: `${modelDesc}, wearing ${clothingDesc}, [POSE]`,
    },
  };

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

/**
 * OpenAI Images 1회 호출 → R2 업로드 → ShotResult 반환.
 * 함수 내부에서 throw 하지 않고 ShotResult 의 failed 형태로 반환.
 */
async function generateOneShot(args: {
  apiKey: string;
  env: Env;
  modelDesc: string;
  clothingDesc: string;
  pose: string;
  index: number;
}): Promise<ShotResult> {
  const { apiKey, env, modelDesc, clothingDesc, pose, index } = args;
  const t0 = Date.now();

  const prompt = `${modelDesc}, wearing ${clothingDesc}, ${pose}`;

  const apiResp = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: IMAGE_SIZE,
      quality: 'standard',
      // gpt-image 계열은 b64_json 만 지원하는 케이스가 많아 명시.
      response_format: 'b64_json',
    }),
  });

  if (!apiResp.ok) {
    const errBody = await apiResp.text();
    return {
      pose,
      index,
      status: 'failed',
      error: {
        httpStatus: apiResp.status,
        message: `OpenAI ${apiResp.status} ${apiResp.statusText}`,
        body: errBody.slice(0, 1000),
      },
      durationMs: Date.now() - t0,
    };
  }

  const json = (await apiResp.json()) as OpenAiImageResponse;
  const b64 = json.data?.[0]?.b64_json;
  if (typeof b64 !== 'string' || b64.length === 0) {
    return {
      pose,
      index,
      status: 'failed',
      error: {
        httpStatus: 200,
        message: 'OpenAI 200 but no b64_json in response',
        body: JSON.stringify(json).slice(0, 1000),
      },
      durationMs: Date.now() - t0,
    };
  }

  // base64 → ArrayBuffer
  const bytes = base64ToBytes(b64);

  // PoC 는 가짜 userId/ownerId 로 R2 key 생성. Sprint 2 부터 실제 sku.id 사용.
  const key = buildR2Key({
    kind: 'shot',
    userId: 'poc-user',
    ownerId: `poc-${new Date().toISOString().slice(0, 10)}`,
    ext: 'png',
  });
  await putObject(env, key, bytes, 'image/png');

  return {
    pose,
    index,
    status: 'ok',
    url: publicUrl(env, key),
    durationMs: Date.now() - t0,
  };
}

/**
 * Workers 런타임은 Buffer 가 없어 atob 사용.
 * 256KB ~ 2MB 이미지에 충분.
 */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ code, message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
