import { DISCLAIMER_LINES } from '@/lib/constants';

export default function Disclaimer() {
  return (
    <div className="disclaimer">
      <strong>안내</strong>
      <ul>
        {DISCLAIMER_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
