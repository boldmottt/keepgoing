import { SITE_NAME } from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          {SITE_NAME} — 게임 플레이로 쌓은 기부 포인트가 실제 기부 프로젝트의
          결과를 바꿉니다.
        </p>
        <p>
          기부 포인트는 현금이 아니며 인출되지 않습니다. 실제 기부는
          회사/후원사가 진행하고, 기부 내역은 본 홈페이지에 공개됩니다.
        </p>
        <p className="muted">© {new Date().getFullYear()} KeepGoing</p>
      </div>
    </footer>
  );
}
