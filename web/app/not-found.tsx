import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section">
      <h1 className="page-title">페이지를 찾을 수 없습니다</h1>
      <p className="page-sub">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <p>
        <Link href="/">← 홈으로</Link>
      </p>
    </section>
  );
}
