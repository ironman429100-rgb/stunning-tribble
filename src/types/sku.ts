/**
 * SKU = "Stock Keeping Unit" — 한 상품 한 색/한 사이즈 단위.
 * 사용자가 도매처(신상마켓 등) URL을 입력하면 SKU 1건이 생성되고,
 * 모델 사진 6컷 + 상세페이지 1장이 이 SKU에 묶여 나간다.
 *
 * v1: 단일 모델 프리셋, Standard($0.04 × 6 = $0.24/SKU)
 * v2: 다중 모델 동시, HD 옵션
 * v3: 코디셋(여러 SKU 합성)
 */

/**
 * SKU 라이프사이클.
 * - draft       : URL 입력만 됨, 아직 생성 안 함
 * - generating  : OpenAI Images 호출 중 (Queue에 들어가 있음)
 * - ready       : 6컷 + 상세 모두 R2에 저장 완료, 다운로드 가능
 * - error       : 콘텐츠 정책 거부 / 모델 일관성 실패 / 비용 초과 등
 *
 * v1: 4개 상태로 충분
 * v2 후보: `partial` (6컷 중 일부만) — 지금은 부분 실패도 error로 묶음
 */
export type SkuStatus = 'draft' | 'generating' | 'ready' | 'error';

/**
 * 마진 계산 결과. 도매가 + 부가비용 → 권장 소매가 산출.
 * 모든 금액은 KRW(원) 정수 단위. 부동소수점 금지.
 *
 * v1: 단일 화폐(KRW), 단일 마진 룰
 * v2: 환율(USD/CNY) 자동 변환, 카테고리별 마진 룰
 */
export interface MarginCalculation {
  /** 도매가 (원). 신상마켓에서 크롤링한 값. */
  wholesalePrice: number;
  /** 권장 소매가 (원). 마진 룰 적용 후. */
  recommendedRetailPrice: number;
  /** 적용된 마진율 (0.0 ~ 1.0). 예: 0.5 = 50%. */
  marginRate: number;
  /** 배송/포장/플랫폼 수수료 합계 (원). v1은 고정값 추정. */
  estimatedFees: number;
  /** 순이익 추정 (원) = retail - wholesale - fees. */
  estimatedProfit: number;
  /** 계산 시점 ISO 타임스탬프. 환율 변동 추적용. */
  calculatedAt: string;
}

/**
 * SKU 본체. Supabase `skus` 테이블과 1:1.
 */
export interface Sku {
  /** UUID (Supabase에서 gen_random_uuid()). */
  id: string;
  /** 소유 사용자 (auth.users.id). */
  userId: string;
  /** 도매처 원본 URL. */
  sourceUrl: string;
  /**
   * 도매처 플랫폼 식별자.
   * v1: 'sinsangmarket' 만 지원. v2: 'taobao' | 'alibaba' 추가 검토.
   */
  sourcePlatform: 'sinsangmarket' | 'unknown';
  /** 상품명 (크롤링). */
  productName: string | null;
  /** 라이프사이클 상태. */
  status: SkuStatus;
  /**
   * 생성된 이미지 URL 목록 (R2 public URL).
   * v1: 모델 6컷 + 상세 1장 = 최대 7개.
   * 순서 보장: index 0~5 = 모델샷, index 6 = 상세.
   */
  generatedImages: string[];
  /** 마진 계산 결과. 아직 계산 전이면 null. */
  marginCalc: MarginCalculation | null;
  /** 생성/수정 타임스탬프 (ISO). */
  createdAt: string;
  updatedAt: string;
}
