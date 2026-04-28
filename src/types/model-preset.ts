/**
 * Model Preset = 사용자가 등록한 "가상 모델" 1명.
 * 얼굴 일관성 유지를 위해 reference 이미지 2~5장을 미리 등록해두고,
 * SKU 생성 시 이 프리셋을 골라 6컷을 생성한다.
 *
 * v1: 사용자당 프리셋 1~3개, 단일 프리셋만 SKU에 적용
 * v2: 다중 프리셋 동시 운용 (CLAUDE.md "NOT in scope v1" 항목)
 * v3: 프리셋 합성(코디셋)
 */

/**
 * 모델 성별 — OpenAI Images 프롬프트 토큰에 직접 들어감.
 * v1: 3개. v2: 'kid' 추가 검토 (아동복 카테고리).
 */
export type GenderType = 'female' | 'male' | 'unisex';

/**
 * 포즈 템플릿 — 6컷 구성을 어떤 포즈 조합으로 채울지.
 * src/lib/pose-templates.ts 에서 실제 프롬프트 토큰으로 매핑.
 *
 * v1: 5개 고정 템플릿 (정면/측면/뒤/디테일/풀샷 조합)
 * v2: 사용자 커스텀 포즈 정의
 */
export interface PoseTemplate {
  /** 템플릿 식별자 (slug). 예: 'standard-6shot'. */
  id: string;
  /** 화면 표시용 한글 이름. */
  name: string;
  /**
   * 6컷 각 인덱스의 포즈 키워드.
   * 길이 정확히 6. OpenAI 프롬프트에 한 컷씩 합성됨.
   */
  poses: [string, string, string, string, string, string];
  /** 사용자에게 보여줄 설명 1줄. */
  description: string;
}

/**
 * Model Preset 본체. Supabase `model_presets` 테이블과 1:1.
 */
export interface ModelPreset {
  /** UUID. */
  id: string;
  /** 소유 사용자. */
  userId: string;
  /** 사용자 지정 이름 (예: "기본 여성 모델 A"). */
  name: string;
  /** 모델 성별. */
  gender: GenderType;
  /**
   * 레퍼런스 이미지 URL 목록 (R2). 얼굴 일관성 유지용.
   * v1: 2~5장 권장. 1장도 허용하되 일관성 품질 떨어짐.
   */
  referenceImages: string[];
  /**
   * 프롬프트 메타데이터. 모델 외형 디테일.
   * v1: 자유 텍스트. v2: 구조화된 필드(키, 헤어 컬러, 톤 등).
   */
  metadata: {
    /** 추가 외형 묘사 (자유 텍스트, 한글/영문 OK). */
    appearanceNotes?: string;
    /** 선호 포즈 템플릿 ID. 없으면 사용자가 SKU별로 선택. */
    defaultPoseTemplateId?: string;
  };
  /** 생성/수정 타임스탬프 (ISO). */
  createdAt: string;
  updatedAt: string;
}
