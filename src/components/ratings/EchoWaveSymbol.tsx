import type { SVGProps } from "react";
import type { RatingValue } from "@/lib/ratings/model";

/** Rounded right-facing arcs follow Echo's logo; each level adds a wider arc. */
export default function EchoWaveSymbol({ level, ...props }: SVGProps<SVGSVGElement> & { level: RatingValue }) {
  return (
    <svg viewBox="0 0 26 34" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" aria-hidden="true" {...props}>
      {Array.from({ length: level }, (_, index) => {
        const radius = 5 + index * 4;
        const x = 2 + radius * Math.cos(Math.PI * 0.27);
        const y = radius * Math.sin(Math.PI * 0.27);
        return <path key={radius} d={`M ${x} ${17 - y} A ${radius} ${radius} 0 0 1 ${x} ${17 + y}`} />;
      })}
    </svg>
  );
}
