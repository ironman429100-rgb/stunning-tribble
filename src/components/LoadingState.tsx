import type { CSSProperties } from 'react';

/**
 * 4경로 처리 원칙(Happy/Nil/Empty/Error) 중 "로딩" 전이 상태.
 * 데이터 페칭 / OpenAI 생성 대기 / 큐 처리 중 등에 사용.
 *
 * variant:
 * - 'spinner'  : 짧은 대기(<3s 예상). 단일 회전 아이콘.
 * - 'skeleton' : 긴 대기(>3s) 또는 리스트/카드 그리드. 박스 펄스.
 */
export interface LoadingStateProps {
  /** 로딩 시각화 종류. */
  variant: 'spinner' | 'skeleton';
  /** 보조 메시지. 예: "이미지 6컷 생성 중...". 생략 가능. */
  message?: string;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '32px 24px',
  color: '#666',
};

const messageStyle: CSSProperties = {
  fontSize: 14,
  margin: 0,
};

const spinnerStyle: CSSProperties = {
  width: 32,
  height: 32,
  border: '3px solid #eee',
  borderTopColor: '#111',
  borderRadius: '50%',
  animation: 'fashion-saas-spin 0.9s linear infinite',
};

const skeletonRowStyle: CSSProperties = {
  width: '100%',
  maxWidth: 480,
  height: 16,
  borderRadius: 4,
  background:
    'linear-gradient(90deg, #f0f0f0 0%, #e6e6e6 50%, #f0f0f0 100%)',
  backgroundSize: '200% 100%',
  animation: 'fashion-saas-pulse 1.4s ease-in-out infinite',
};

/**
 * keyframes를 인라인 스타일로 주입할 수 없으니
 * 컴포넌트 마운트 시 1회만 <style> 태그를 head에 주입.
 * (CSS-in-JS 라이브러리 도입 회피 — 혁신 토큰 절약)
 */
const KEYFRAMES_ID = 'fashion-saas-loading-keyframes';
function ensureKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID) !== null) return;
  const styleEl = document.createElement('style');
  styleEl.id = KEYFRAMES_ID;
  styleEl.textContent = `
@keyframes fashion-saas-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes fashion-saas-pulse {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;
  document.head.appendChild(styleEl);
}

export default function LoadingState({ variant, message }: LoadingStateProps) {
  ensureKeyframes();

  return (
    <div style={containerStyle} role="status" aria-live="polite">
      {variant === 'spinner' ? (
        <div style={spinnerStyle} aria-hidden="true" />
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 480,
          }}
          aria-hidden="true"
        >
          <div style={skeletonRowStyle} />
          <div style={{ ...skeletonRowStyle, width: '85%' }} />
          <div style={{ ...skeletonRowStyle, width: '70%' }} />
        </div>
      )}
      {message !== undefined && <p style={messageStyle}>{message}</p>}
    </div>
  );
}
