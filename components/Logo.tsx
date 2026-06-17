export default function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="13" y="13" width="230" height="230" rx="66" fill="#ef7d2a" stroke="#1c1b19" strokeWidth="11" />
      <path d="M76 134 L114 172 L184 90" stroke="#fffdf6" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
