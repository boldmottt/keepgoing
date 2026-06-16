import type { Metadata } from 'next';
import './globals.css';
import { SITE_NAME, SITE_TAGLINE } from '@/lib/constants';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description:
    '게임 플레이로 쌓은 기부 포인트가 실제 기부 프로젝트의 결과를 바꿉니다. 시즌 기부금 풀과 실제 기부 내역을 투명하게 공개합니다.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="container">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
