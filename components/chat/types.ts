export interface ProductVariant {
  id: string;
  color: string;
  size: string;
  price: string;
  available: boolean;
}

export interface ProductCardData {
  name: string;
  price: string;
  image?: string;
  description?: string;
  variantId: string;
  handle?: string;
  variants?: ProductVariant[];
}

export interface Message {
  id: string;
  content: string;
  role: "user" | "webhook";
  timestamp: Date;
  type: "text" | "voice";
  audioUrl?: string;
  cards?: ProductCardData[];
}

export interface Conversation {
  conversation_id: string;
  name: string;
  started_at: string;
  ended_at?: string;
}

export interface HistoryItem {
  event_type: string;
  user_message: string;
  ai_message: string;
  cards?: ProductCardData[];
  timestamp: string;
}