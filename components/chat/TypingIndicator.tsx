
import React from "react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="p-4 min-w-[120px]">
      <div className="flex items-center space-x-2">
        <span className="text-xs text-gray-500 mr-3">AI is typing</span>
        <div className="flex space-x-1">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "200ms", animationDuration: "1.4s" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "400ms", animationDuration: "1.4s" }}
          ></div>
        </div>
      </div>
    </div>
  );
};
