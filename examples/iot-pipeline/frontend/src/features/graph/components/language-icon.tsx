import { cn } from "@/shared/lib/utils";
import type { WorkerLanguage } from "@/shared/types/worker";

interface LanguageIconProps {
  language: WorkerLanguage;
  className?: string;
}

function RustIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Rust"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
    >
      <circle cx="10" cy="10" r="8" stroke="#CE422B" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3" fill="#CE422B" />
      <path d="M10 2V5M10 15V18M2 10H5M15 10H18" stroke="#CE422B" strokeWidth="1.5" />
      <path
        d="M4.34 4.34L6.46 6.46M13.54 13.54L15.66 15.66M4.34 15.66L6.46 13.54M13.54 6.46L15.66 4.34"
        stroke="#CE422B"
        strokeWidth="1"
      />
    </svg>
  );
}

function PythonIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Python"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
    >
      <path
        d="M10 2C6 2 6.5 3.5 6.5 3.5V5.5H10.5V6.5H4.5S2 6 2 10S4 14 4 14H5.5V11.5S5.3 9.5 7.5 9.5H12.5S14.5 9.5 14.5 7.5V4S14.8 2 10 2Z"
        fill="#3776AB"
      />
      <path
        d="M10 18C14 18 13.5 16.5 13.5 16.5V14.5H9.5V13.5H15.5S18 14 18 10S16 6 16 6H14.5V8.5S14.7 10.5 12.5 10.5H7.5S5.5 10.5 5.5 12.5V16S5.2 18 10 18Z"
        fill="#FFD43B"
      />
      <circle cx="7.5" cy="4.5" r="1" fill="#FFD43B" />
      <circle cx="12.5" cy="15.5" r="1" fill="#3776AB" />
    </svg>
  );
}

function NodeIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Node.js"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-5", className)}
    >
      <path
        d="M10 1L18 5.5V14.5L10 19L2 14.5V5.5L10 1Z"
        stroke="#339933"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M10 1V19M2 5.5L18 14.5M18 5.5L2 14.5"
        stroke="#339933"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />
    </svg>
  );
}

export function LanguageIcon({ language, className }: LanguageIconProps) {
  switch (language) {
    case "rust":
      return <RustIcon className={className} />;
    case "python":
      return <PythonIcon className={className} />;
    case "node":
      return <NodeIcon className={className} />;
  }
}
