export default function StatBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="statbox">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}
