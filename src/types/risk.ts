/**
 * BANNED-RISK = "혁신 토큰 3개" 중 하나 (CLAUDE.md Principles).
 * 도매 상품 / 생성 결과물 / 카피에 대해 표시광고법·전자상거래법·상표권 등
 * 한국 시장 특유의 리스크를 사전 점수화한다.
 *
 * v1: 키워드 룰 기반 (예: "100% 정품", "최저가", 특정 브랜드명 등)
 * v2: GPT-4o-mini 기반 의미 추론 + 룰 보강
 * v3: 판례/규제 변동 자동 학습
 */

/**
 * 리스크 등급. UI 색상/CTA에 직접 매핑.
 * - safe       : 발행해도 OK (녹색 배지)
 * - caution    : 사용자 확인 필요 (노란 배지, "이 표현 정말 쓰시겠어요?")
 * - high-risk  : 자동 차단 권장 (빨간 배지, 발행 버튼 비활성화)
 */
export type RiskLevel = 'safe' | 'caution' | 'high-risk';

/**
 * 리스크 사유 1건 — 어떤 항목 때문에 점수가 깎였나.
 * 사용자에게 "이 부분이 문제예요" 보여줄 때 그대로 렌더.
 */
export interface RiskReason {
  /**
   * 룰 식별자. src/lib/banned-risk.ts 의 룰 목록과 매칭.
   * 예: 'banned-superlative', 'trademark-conflict', 'price-claim'
   */
  ruleId: string;
  /** 룰 카테고리. v1: 5종. v2 추가 가능. */
  category:
    | 'superlative' // "최고", "1위", "최저가" 등 표시광고법 위반
    | 'trademark' // 등록 상표 무단 사용
    | 'health-claim' // "효과 있다" 등 의료/건강 과장
    | 'price-claim' // 비교가격 표시 위반
    | 'origin'; // 원산지 표시 누락/허위
  /** 매칭된 텍스트 스니펫 (사용자 입력 또는 생성 결과 일부). */
  matchedText: string;
  /** 사용자에게 보여줄 설명 1~2줄 (한글). */
  explanation: string;
  /** 이 사유 단독 감점 (0~100). 합산은 RiskScore.totalScore 가 처리. */
  penalty: number;
}

/**
 * 리스크 점수 종합. 카피/SKU/상세페이지 단위로 매겨짐.
 */
export interface RiskScore {
  /**
   * 총점 (0 ~ 100). 100 = 가장 안전.
   * v1: 100 - sum(penalty) 단순 합산. 음수면 0으로 클램프.
   */
  totalScore: number;
  /** 등급. 점수 임계값으로 환산: safe ≥80, caution 50~79, high-risk <50. */
  level: RiskLevel;
  /** 감점 사유 목록. 빈 배열이면 issue 없음 = safe. */
  reasons: RiskReason[];
  /** 평가 시점 ISO. 룰 업데이트 후 재평가 추적용. */
  evaluatedAt: string;
  /**
   * 평가에 사용된 룰셋 버전.
   * 예: 'v1.0.0'. 룰 추가/변경 시 버전 올리고 재평가 트리거.
   */
  rulesetVersion: string;
}
