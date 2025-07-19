
import React from "react";
import { Sparkles, Zap, Star } from "lucide-react";

export const TypingIndicator: React.FC = () => (
  <div className="flex items-center space-x-4 p-5">
    <div className="flex space-x-2">
      <div
        className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce shadow-lg shadow-blue-500/30"
        style={{ animationDelay: "0ms" }}
      ></div>
      <div
        className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-bounce shadow-lg shadow-purple-500/30"
        style={{ animationDelay: "200ms" }}
      ></div>
      <div
        className="w-3 h-3 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full animate-bounce shadow-lg shadow-pink-500/30"
        style={{ animationDelay: "400ms" }}
      ></div>
    </div>
    <span className="text-sm text-gray-700 font-semibold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">
      AI is crafting your response
    </span>
    <div className="flex space-x-1">
      <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
      <Zap className="h-4 w-4 text-blue-500 animate-bounce" />
      <Star className="h-4 w-4 text-purple-500 animate-pulse" />
    </div>
  </div>
);
