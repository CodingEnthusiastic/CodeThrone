import React from "react";

const StarsBackground: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      zIndex: 0,
      pointerEvents: "none",
      overflow: "hidden",
    }}
  >
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 120 }).map((_, i) => {
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const dur = 1.5 + Math.random() * 2;
        return (
          <circle
            key={i}
            cx={`${x}%`}
            cy={`${y}%`}
            r={Math.random() * 1.2 + 0.3}
            fill="#fff"
          >
            <animate
              attributeName="cx"
              values={`${x}%;${x + 40}%`}
              dur={`${dur}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="1;0.7;1"
              dur={`${dur * 0.7}s`}
              repeatCount="indefinite"
            />
          </circle>
        );
      })}
    </svg>
  </div>
);

export default StarsBackground;
