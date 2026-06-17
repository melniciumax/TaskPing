// Static decorative concentric quarter-rainbow (top-right corner origin).
// Flip/rotate via the `style` transform from the parent. No animation.
export default function Rainbow({ size = 260, style }: { size?: number; style?: React.CSSProperties }) {
  const cx = size;
  const cy = 0;
  const bands = [
    { r: size * 0.62, c: "#f3a3c6" },
    { r: size * 0.48, c: "#ef7d2a" },
    { r: size * 0.34, c: "#f4bd2f" },
  ];
  const arc = (r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx} ${cy + r}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" style={style} aria-hidden="true">
      {bands.map((b, i) => (
        <path key={`k${i}`} d={arc(b.r)} stroke="#1c1b19" strokeWidth={size * 0.132} />
      ))}
      {bands.map((b, i) => (
        <path key={`c${i}`} d={arc(b.r)} stroke={b.c} strokeWidth={size * 0.1} />
      ))}
    </svg>
  );
}
