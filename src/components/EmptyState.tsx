import type { ReactNode, CSSProperties } from 'react';

/**
 * 4경로 처리 원칙(Happy/Nil/Empty/Error) 중 "Empty" 전용.
 * 데이터를 정상 조회했으나 결과가 0건일 때 사용.
 *
 * 예: SKU 라이브러리에 아직 등록한 SKU 없음, 검색 결과 0건.
 */
export interface EmptyStateProps {
  /** 좌측 또는 상단 아이콘. emoji 문자열 또는 SVG 컴포넌트. 생략 가능. */
  icon?: ReactNode;
  /** 큰 제목 1줄. 예: "아직 등록된 SKU가 없어요". */
  title: string;
  /** 보조 설명 1~2줄. 무엇을 하면 채워지는지 안내. */
  description?: string;
  /**
   * 다음 행동 유도 버튼. label + onClick 쌍.
   * 생략하면 버튼 미렌더 (단순 안내 화면).
   */
  ctaButton?: {
    label: string;
    onClick: () => void;
  };
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '48px 24px',
  textAlign: 'center',
  color: '#666',
};

const iconStyle: CSSProperties = {
  fontSize: 48,
  lineHeight: 1,
  marginBottom: 8,
};

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: '#222',
  margin: 0,
};

const descStyle: CSSProperties = {
  fontSize: 14,
  color: '#888',
  maxWidth: 360,
  margin: 0,
  lineHeight: 1.5,
};

const ctaStyle: CSSProperties = {
  marginTop: 12,
  padding: '10px 20px',
  borderRadius: 6,
  border: '1px solid #111',
  background: '#111',
  color: '#fff',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export default function EmptyState({
  icon,
  title,
  description,
  ctaButton,
}: EmptyStateProps) {
  return (
    <div style={containerStyle} role="status">
      {icon !== undefined && <div style={iconStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description !== undefined && <p style={descStyle}>{description}</p>}
      {ctaButton !== undefined && (
        <button type="button" style={ctaStyle} onClick={ctaButton.onClick}>
          {ctaButton.label}
        </button>
      )}
    </div>
  );
}
