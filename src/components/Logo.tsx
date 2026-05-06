import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo = ({ className, size = 32 }: LogoProps) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path 
        d="M102.4 110C153.6 204.8 153.6 307.2 102.4 402H194.56L276.48 256L194.56 110H102.4Z" 
        fill="#FFC107" 
      />
      <path 
        d="M235.52 110L317.44 256L235.52 402H327.68L440.32 256L327.68 110H235.52Z" 
        fill="#FFC107" 
      />
    </svg>
  );
};
