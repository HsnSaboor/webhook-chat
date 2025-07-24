
import React from "react";
import { Conversation } from "./types";

interface ConversationsListProps {
  conversations: Conversation[];
  loadingConversations: boolean;
  loadingHistory: boolean;
  onLoadConversation: (conversationId: string) => void;
  onStartNewConversation: () => void;
}

export const ConversationsList: React.FC<ConversationsListProps> = ({
  conversations,
  loadingConversations,
  loadingHistory,
  onLoadConversation,
  onStartNewConversation,
}) => {
  // Limit to recent 3 conversations
  const recentConversations = conversations.slice(0, 3);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "00:00";
    }
  };

  const truncateText = (text: string, maxLength: number = 10) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <div className="w-full max-w-xs rounded-lg border border-border p-3 bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 delay-200 mt-6 mx-auto overflow-hidden">
      <h3 className="text-base font-semibold text-foreground mb-3 truncate">
        Recent Chats
      </h3>
      <div className="space-y-2 overflow-hidden">
        {loadingConversations ? (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading...
          </div>
        ) : recentConversations.length > 0 ? (
          <>
            {recentConversations.map((conversation, index) => {
              // Safety check for conversation object
              if (!conversation || typeof conversation !== 'object') {
                console.warn(`[ConversationsList] Invalid conversation at index ${index}:`, conversation);
                return null;
              }

              const conversationId = conversation.conversation_id || conversation.id || `fallback-${index}`;
              const conversationName = conversation.name || "New Chat";
              const startedAt = conversation.started_at || conversation.timestamp || new Date().toISOString();

              return (
                <button
                  key={conversationId}
                  onClick={() => onLoadConversation(conversationId)}
                  disabled={loadingHistory}
                  className="w-full text-left p-2 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50 overflow-hidden"
                >
                  <div className="font-medium text-sm text-foreground truncate min-w-0">
                    {truncateText(conversationName)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    {formatTime(startedAt)}
                  </div>
                </button>
              );
            }).filter(Boolean)}
            <button
              onClick={onStartNewConversation}
              className="w-full text-left p-2 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors duration-200 overflow-hidden"
            >
              <div className="font-medium text-sm text-blue-600 dark:text-blue-400 truncate">
                + Start New Chat
              </div>
            </button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No recent conversations. Start chatting!
          </div>
        )}
      </div>
    </div>
  );
};
