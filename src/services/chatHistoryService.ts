import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';

export type SavedChatMessage = { id: number; role: 'user' | 'assistant'; content: string };
export type ChatConversation = { id: string; title: string; updatedAt: string; messages: SavedChatMessage[] };

const STORAGE_KEY = '@lifeorganicfit/ai-chat-history-v1';

async function storageKey() {
  if (!isSupabaseConfigured) return `${STORAGE_KEY}/local-device`;
  const { data, error } = await requireSupabase().auth.getUser();
  if (error) throw error;
  return `${STORAGE_KEY}/${data.user?.id ?? 'local-device'}`;
}

export async function loadChatHistory(): Promise<ChatConversation[]> {
  const saved = await AsyncStorage.getItem(await storageKey());
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed)) return [];
  return (parsed as ChatConversation[])
    .filter((conversation) => typeof conversation.id === 'string' && Array.isArray(conversation.messages))
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
}

export async function saveChatConversation(conversation: ChatConversation): Promise<ChatConversation[]> {
  const key = await storageKey();
  const saved = await AsyncStorage.getItem(key);
  const current = saved ? JSON.parse(saved) as ChatConversation[] : [];
  const next = [conversation, ...current.filter((item) => item.id !== conversation.id)]
    .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}

export async function deleteChatConversation(conversationId: string): Promise<ChatConversation[]> {
  const key = await storageKey();
  const saved = await AsyncStorage.getItem(key);
  const current = saved ? JSON.parse(saved) as ChatConversation[] : [];
  const next = current.filter((conversation) => conversation.id !== conversationId);
  await AsyncStorage.setItem(key, JSON.stringify(next));
  return next;
}
