
import React from "react";

export const ParticleBackground: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {Array.from({ length: 9 }, (_, i) => (
      <div key={i} className="particle" />
    ))}
  </div>
);
