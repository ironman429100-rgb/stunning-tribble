import { useState, type FormEvent } from 'react';

export default function NewSku() {
  const [url, setUrl] = useState('');

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url.trim()) return;
    // TODO: Sprint 2 — POST /api/crawl-product
    alert(`크롤링 예정 URL: ${url}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1>New SKU</h1>
      <p style={{ color: '#666' }}>
        에이블리 / 지그재그 / 4910 상품 URL을 붙여넣으세요.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://a-bly.com/goods/..."
          required
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: 14,
            border: '1px solid #ccc',
            borderRadius: 6,
          }}
        />
        <button
          type="submit"
          style={{
            padding: '10px 20px',
            fontSize: 14,
            background: '#111',
            color: '#fff',
            border: 0,
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          시작
        </button>
      </form>
    </main>
  );
}
