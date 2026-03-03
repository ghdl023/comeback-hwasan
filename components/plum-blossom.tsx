"use client";

export function PlumBlossom({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g transform="translate(50,50)">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse
            key={angle}
            cx="0"
            cy="-22"
            rx="14"
            ry="20"
            fill="currentColor"
            opacity="0.85"
            transform={`rotate(${angle})`}
          />
        ))}
        <circle cx="0" cy="0" r="8" fill="currentColor" opacity="0.5" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <circle
            key={`stamen-${angle}`}
            cx={Math.cos((angle * Math.PI) / 180) * 5}
            cy={Math.sin((angle * Math.PI) / 180) * 5}
            r="1.5"
            fill="currentColor"
            opacity="0.9"
          />
        ))}
      </g>
    </svg>
  );
}
