import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';

export default function Header() {
  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand">
          {SITE_NAME}
        </Link>
        <nav className="nav">
          <Link href="/">소개</Link>
          <Link href="/donations">기부 현황</Link>
          <Link href="/leaderboard">리더보드</Link>
          <Link href="/reports">기부 내역</Link>
          <Link href="/admin">관리자</Link>
        </nav>
      </div>
    </header>
  );
}
