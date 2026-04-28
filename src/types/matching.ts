/**
 * 한국 도매 매칭 — "혁신 토큰 3개" 중 하나 (CLAUDE.md Principles).
 * 신상마켓 등에서 크롤링한 도매 상품을 사용자가 입력한 URL/이미지와
 * 의미 단위로 매칭해서 정확한 도매 데이터(가격/사이즈/원단)를 끌어온다.
 *
 * v1: 신상마켓 단일 소스, 키워드 + 이미지 임베딩 단순 매칭
 * v2: 다중 소스(타오바오, 알리바바 1688), 카테고리 추론
 * v3: 트렌드 기반 추천(어떤 도매 상품이 잘 팔릴지)
 */

/**
 * 도매 상품 1건. 신상마켓에서 크롤링한 raw 데이터 + 정규화 필드.
 */
export interface WholesaleProduct {
  /** 도매처 내부 상품 ID (신상마켓 productId 등). */
  externalId: string;
  /** 출처 플랫폼. v1은 'sinsangmarket' 만. */
  platform: 'sinsangmarket';
  /** 상품 상세 페이지 URL. */
  productUrl: string;
  /** 상품명 원문 (한글). */
  title: string;
  /** 도매가 (원). */
  wholesalePrice: number;
  /** 권장 소비자가 (원). 도매처가 표시한 값. 없으면 null. */
  suggestedRetailPrice: number | null;
  /** 대표 이미지 URL 목록. */
  imageUrls: string[];
  /**
   * 카테고리 경로. 예: ['여성의류', '아우터', '코트'].
   * v1: 도매처 raw 카테고리 그대로. v2: 통합 카테고리 매핑.
   */
  categoryPath: string[];
  /** 사이즈 옵션 목록. 자유 문자열(F, S, M, L, XL, 44, 55, 66 등 혼재). */
  sizes: string[];
  /** 색상 옵션 목록. */
  colors: string[];
  /** 크롤링 시점 ISO. 가격 변동 추적. */
  crawledAt: string;
}

/**
 * 매칭 결과 1건 — 사용자 쿼리에 대한 후보 도매 상품.
 * v1: 단순 점수, top 5 반환.
 */
export interface MatchResult {
  /** 매칭된 도매 상품. */
  product: WholesaleProduct;
  /**
   * 매칭 신뢰도 (0.0 ~ 1.0).
   * v1: keyword 자카드 + 이미지 임베딩 코사인 합성 가중치.
   * 0.7 이상 권장, 0.5 미만은 후보에서 제외.
   */
  score: number;
  /**
   * 점수 기여 요인. UI에 "왜 이게 매칭됐나" 보여줄 때.
   * v1: 'keyword' | 'image' | 'category' 정도면 충분.
   */
  matchedBy: Array<'keyword' | 'image' | 'category'>;
  /** 사용자에게 보여줄 매칭 사유 1줄 (한글). */
  reason: string;
}
