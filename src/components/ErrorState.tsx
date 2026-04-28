import type { CSSProperties } from 'react';

/**
 * 4경로 처리 원칙(Happy/Nil/Empty/Error) 중 "Error" 전용.
 * 네트워크 실패, API 5xx, 콘텐츠 정책 거부 등 예외 상황 표시.
 *
 * retryHandler를 주면 재시도 버튼이 렌더되고, 없으면 안내만.
 */
export interface ErrorStateProps {
  /**
   * 에러 코드 (선택). 사용자/지원팀이 인용할 수 있는 짧은 식별자.
   * 예: 'OPENAI_POLICY', 'SUPABASE_TIMEOUT', 'NETWORK_OFFLINE'
   */
  errorCode?: string;
  /**
   * 사용자 친화적 메시지 1~2줄. 한글 권장.
   * 기술적 스택 트레이스는 여기 넣지 말 것 (콘솔로 따로).
   */
  message: string;
  /**
   * 재시도 핸들러. 주면 "다시 시도" 버튼이 노출됨.
   * 비동기여도 OK — UI 측에서 await 하지 않음.
   */
  retryHandler?: () => void;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  padding: '32px 24px',
  textAlign: 'center',
  background: '#fff5f5',
  border: '1px solid #ffd7d7',
  borderRadius: 8,
  color: '#7a1f1f',
};

const iconStyle: CSSProperties = {
  fontSize: 32,
  lineHeight: 1,
};

const messageStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  margin: 0,
  maxWidth: 420,
  lineHeight: 1.5,
};

const codeStyle: CSSProperties = {
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  color: '#a04545',
  background: '#ffe8e8',
  padding: '2px 8px',
  borderRadius: 4,
};

const retryStyle: CSSProperties = {
  marginTop: 8,
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #7a1f1f',
  background: '#fff',
  color: '#7a1f1f',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};

export default function ErrorState({
  errorCode,
  message,
  retryHandler,
}: ErrorStateProps) {
  return (
    <div style={containerStyle} role="alert">
      <div style={iconStyle} aria-hidden="true">
        ⚠️
      </div>
      <p style={messageStyle}>{message}</p>
      {errorCode !== undefined && <code style={codeStyle}>{errorCode}</code>}
      {retryHandler !== undefined && (
        <button type="button" style={retryStyle} onClick={retryHandler}>
          다시 시도
        </button>
      )}
    </div>
  );
}
