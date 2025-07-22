
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
  return (
    <div className="w-full max-w-sm rounded-lg border border-border p-4 bg-card shadow-lg animate-in fade-in slide-in-from-bottom-4 delay-200 mt-8 mx-auto">
      <h3 className="text-lg font-semibold text-foreground mb-3">
        Recent Chats
      </h3>
      <div className="space-y-2">
        {loadingConversations ? (
          <div className="text-sm text-muted-foreground animate-pulse">
            Loading conversations...
          </div>
        ) : conversations.length > 0 ? (
          <>
            {conversations.map((conversation, index) => {
              // Safety check for conversation object
              if (!conversation || typeof conversation !== 'object') {
                console.warn(`[ConversationsList] Invalid conversation at index ${index}:`, conversation);
                return null;
              }

              const conversationId = conversation.conversation_id || conversation.id || `fallback-${index}`;
              const conversationName = conversation.name || conversation.title || "Untitled Conversation";
              const startedAt = conversation.started_at || conversation.timestamp || new Date().toISOString();

              return (
                <button
                  key={conversationId}
                  onClick={() => onLoadConversation(conversationId)}
                  disabled={loadingHistory}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 transition-colors duration-200 disabled:opacity-50"
                >
                  <div className="font-medium text-sm text-foreground truncate">
                    {conversationName}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(startedAt).toLocaleDateString()}
                  </div>
                </button>
              );
            }).filter(Boolean)}
            <button
              onClick={onStartNewConversation}
              className="w-full text-left p-3 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors duration-200"
            >
              <div className="font-medium text-sm text-blue-600 dark:text-blue-400">
                + Start New Chat
              </div>
            </button>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No recent conversations. Start chatting to see your
            history here!
          </div>
        )}
      </div>
    </div>
  );
};
