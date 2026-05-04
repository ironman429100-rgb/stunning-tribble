/**
 * Day 3 저녁 PoC — OpenAI Images 2.0 (gpt-image-2) 1회 검증.
 *
 * 검증 4항목과 baseline 한계:
 *   #1 6컷 모두 생성 (콘텐츠 정책 거부 0)        ← 측정 가능
 *   #2 모델 얼굴 일관성                          ← FAIL 예상 (text-only baseline)
 *      reference image 없이 prompt 만으로는 일관성 보장 불가.
 *      Sprint 2 첫 작업: images.edit + reference image 로 전환.
 *   #3 옷 디테일 재현                            ← 측정 가능
 *   #4 비용이 예상대로인지                       ← OpenAI usage 필드로 검증
 *
 * 따라서 본 PoC 의 실질 검증 대상은 #1 / #3 / #4. 검증 #2 는 baseline 기록용.
 *
 * 호출:
 *   POST /api/_test/poc-images-2?token=79b8a180a05044191dc70dad24c88d49
 *   Content-Type: application/json
 *   { "modelDescription": "...", "clothingDescription": "..." }
 *
 * 비용 보호:
 *   - ?token=<32char> 미스매치 시 401. 우연 호출/봇 크롤링 차단.
 *   - $0.24 / 호출 추정. 실제 청구는 응답 usage 필드로 검증.
 *
 * Lifecycle:
 *   - 검증 완료 → 본 파일 즉시 삭제 ("chore: remove PoC endpoint after validation")
 *   - 토큰도 git 히스토리에서만 살아있게 두면 됨 (rotation 불요).
 */
import type { Env } from '../_lib/env';
import { requireEnv } from '../_lib/env';
import { buildR2Key, putObject, publicUrl } from '../_lib/r2';

/**
 * 호출 인증용 일회성 토큰. 128-bit hex.
 * PoC 파일과 함께 다음 커밋에서 삭제 예정.
 */
const POC_TOKEN = '79b8a180a05044191dc70dad24c88d49';

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
/**
 * Standard quality 1컷당 단가 추정 (USD).
 * 1024x1024 기준값. 1024x1536 은 다를 수 있어 응답의 usage 필드로 실제값 검증.
 */
const ESTIMATED_COST_PER_SHOT_USD = 0.04;

/**
 * OpenAI 응답 형태. usage 필드는 모델/시점별로 형식이 변할 수 있어 unknown 으로 통과.
 * 검증자가 응답 전체를 봐야 정확한 단가 확인 가능.
 */
interface OpenAiImageResponse {
  created: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  /** gpt-image 계열은 input_tokens / output_tokens 형태로 채움. 모델별로 키 다름. */
  usage?: unknown;
  /** 에러 시 OpenAI 가 채우는 필드. */
  error?: { message: string; type: string; code?: string };
}

interface ShotResult {
  pose: string;
  index: number;
  status: 'ok' | 'failed';
  /** ok 일 때만. R2 public URL. */
  url?: string;
  /** OpenAI 응답의 usage 필드 그대로. 단가 검증용. */
  usage?: unknown;
  /** OpenAI 가 prompt 를 자체 수정한 결과. 콘텐츠 정책 추적용. */
  revisedPrompt?: string;
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
  /**
   * 추정 청구액 (USD) = okCount × 0.04.
   * 1024x1024 기준 추정치. 1024x1536 실제값은 shots[*].usage 합산해서 검증.
   */
  estimatedCostUsd: number;
  /** 사용된 모델 + 크기 + quality. 응답 자기문서화. */
  meta: {
    model: string;
    size: string;
    quality: string;
    promptPattern: string;
  };
  /** 검증 #2 가 FAIL 예상이라는 사실 응답에도 명시. */
  validationNote: string;
}

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const token = url.searchParams.get('token') ?? '';
  if (!constantTimeEquals(token, POC_TOKEN)) {
    return jsonError(401, 'POC_BAD_TOKEN', '?token 값 불일치 또는 누락.');
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

  // 6 호출 병렬. allSettled 로 부분 실패도 살리기.
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
    estimatedCostUsd: okCount * ESTIMATED_COST_PER_SHOT_USD,
    meta: {
      model: 'gpt-image-2',
      size: IMAGE_SIZE,
      quality: 'standard',
      promptPattern: `${modelDesc}, wearing ${clothingDesc}, [POSE]`,
    },
    validationNote:
      '검증 #2 (얼굴 일관성)은 text-only baseline 이라 FAIL 예상. ' +
      'Sprint 2 첫 작업으로 images.edit + reference image 전환 예정. ' +
      '본 PoC 의 실질 검증 대상: #1 (6컷 생성), #3 (옷 디테일), #4 (비용 — shots[*].usage 합산 확인).',
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

  const bytes = base64ToBytes(b64);

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
    usage: json.usage,
    revisedPrompt: json.data[0]?.revised_prompt,
    durationMs: Date.now() - t0,
  };
}

/**
 * 길이 다른 문자열도 안전하게 비교 (timing-safe-ish).
 * 32-char 토큰 기준 충분.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

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
