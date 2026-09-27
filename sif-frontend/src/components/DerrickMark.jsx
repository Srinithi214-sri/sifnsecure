// Logo: drilling derrick icon
export default function DerrickMark({ size = 32 }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--surface)" />
      <path
        d="M16 6 10.5 25M16 6l5.5 19M12.2 19h7.6M13.6 14h4.8M12.2 19l6.2-5M19.8 19l-6.2-5M8 25h16"
        fill="none"
        stroke="var(--brand-text)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
