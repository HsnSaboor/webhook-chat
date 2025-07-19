
import React from "react";

interface AnimatedWaveformProps {
  isRecording: boolean;
  audioLevel?: number;
}

export const AnimatedWaveform: React.FC<AnimatedWaveformProps> = ({
  isRecording,
  audioLevel = 0,
}) => {
  const bars = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex items-center justify-center space-x-1.5 bg-gradient-to-r from-red-500/20 via-pink-500/20 to-red-500/20 rounded-full backdrop-blur-md border border-red-300/30 h-8 px-2">
      {bars.map((bar) => {
        const baseHeight = 6;
        const maxHeight = 36;
        const randomMultiplier = Math.random() * 0.8 + 0.2;
        const levelMultiplier = isRecording
          ? audioLevel * randomMultiplier + 0.3
          : 0.2;
        const height = Math.min(
          baseHeight + (maxHeight - baseHeight) * levelMultiplier,
          maxHeight,
        );

        return (
          <div
            key={bar}
            className={`w-1.5 bg-gradient-to-t from-red-500 via-pink-400 to-red-300 rounded-full transition-all duration-200 ${
              isRecording ? "animate-waveform shadow-lg shadow-red-500/30" : ""
            }`}
            style={{
              height: `${height}px`,
              animationDelay: `${bar * 80}ms`,
              animationDuration: `${Math.random() * 400 + 500}ms`,
              filter: isRecording
                ? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.6))"
                : "none",
            }}
          />
        );
      })}
    </div>
  );
};
