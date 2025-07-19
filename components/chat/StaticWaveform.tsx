
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

interface StaticWaveformProps {
  audioUrl?: string;
}

export const StaticWaveform: React.FC<StaticWaveformProps> = ({ audioUrl }) => {
  const bars = Array.from({ length: 24 }, (_, i) => i);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="relative">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
        />
      )}

      <div className="flex items-center p-4 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg px-3 space-x-3">
        {audioUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlayback}
            className="h-10 w-10 p-0 hover:bg-white/30 rounded-full transition-all duration-300 hover:scale-110 shadow-lg hover:shadow-neon border-solid border-slate-300 border-2"
          >
            <Volume2
              className={`h-5 w-5 transition-all duration-300 ${isPlaying ? "animate-pulse text-blue-400 scale-110" : "text-white/90"}`}
            />
          </Button>
        )}

        <div className="flex items-center flex-1 relative space-x-0.5">
          {bars.map((bar) => (
            <div
              key={bar}
              className={`w-1 bg-gradient-to-t from-blue-400 via-purple-400 to-pink-400 rounded-full transition-all duration-300 hover:scale-110 relative z-10 ${
                isPlaying ? "animate-pulse" : ""
              }`}
              style={{
                height: `${Math.random() * 20 + 8}px`,
                opacity: isPlaying ? Math.random() * 0.5 + 0.5 : 0.7,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
