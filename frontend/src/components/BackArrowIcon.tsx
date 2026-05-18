interface BackArrowIconProps {
  size?: number;
  className?: string;
}

/** Thin stroke left arrow (shaft + chevron head) */
export function BackArrowIcon({ size = 20, className }: BackArrowIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M15 10H5M5 10L10 5M5 10L10 15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}