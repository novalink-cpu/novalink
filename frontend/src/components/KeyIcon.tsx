interface KeyIconProps {
  size?: number;
  className?: string;
}

/** Key icon — renders consistently (emoji 🗂 shows as folder on Windows) */
export function KeyIcon({ size = 22, className }: KeyIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 15h9M16 11v4M20 11v4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
      />
    </svg>
  );
}