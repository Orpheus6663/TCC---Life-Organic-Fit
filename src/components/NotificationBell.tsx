import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import { loadForumPosts, type ForumPost } from '../services/forumService';

const LOCAL_FORUM_KEY = '@lifeorganicfit/forum-posts-v1';
const LAST_SEEN_KEY = '@lifeorganicfit/notifications-last-seen';

type NotificationItem = {
  id: string;
  postId: string;
  author: string;
  text: string;
  createdAt: string;
};

function collectComments(comments: ForumPost['comments'], postId: string, ownerId: string): NotificationItem[] {
  return comments.flatMap((comment) => [
    ...(comment.authorId !== ownerId ? [{
      id: `${postId}:${comment.id}`,
      postId,
      author: comment.authorName || 'Alguém',
      text: comment.text,
      createdAt: comment.createdAt,
    }] : []),
    ...collectComments(comment.replies, postId, ownerId),
  ]);
}

export function NotificationBell({ topInset = 16, inline = false }: { topInset?: number; inline?: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const refresh = useCallback(async (isActive: () => boolean) => {
    try {
      let ownerId = 'local-device';
      if (isSupabaseConfigured) {
        const { data } = await requireSupabase().auth.getUser();
        ownerId = data.user?.id ?? '';
        if (!ownerId) {
          if (isActive()) { setItems([]); setUnreadCount(0); }
          return;
        }
      }
      const key = `${LAST_SEEN_KEY}/${ownerId}`;
      const savedLastSeen = await AsyncStorage.getItem(key);
      const lastSeen = savedLastSeen ? Number(savedLastSeen) : Date.now();
      if (!savedLastSeen) await AsyncStorage.setItem(key, String(lastSeen));
      const posts = isSupabaseConfigured
        ? await loadForumPosts()
        : JSON.parse((await AsyncStorage.getItem(LOCAL_FORUM_KEY)) ?? '[]') as ForumPost[];
      const comments = posts
        .filter((post) => post.authorId === ownerId)
        .flatMap((post) => collectComments(post.comments, post.id, ownerId))
        .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt))
        .filter((comment) => Date.now() - Date.parse(comment.createdAt) < 30 * 24 * 60 * 60 * 1000)
        .slice(0, 30);
      if (isActive()) {
        setItems(comments);
        setUnreadCount(comments.filter((comment) => Date.parse(comment.createdAt) > lastSeen).length);
      }
    } catch {
      if (isActive()) { setItems([]); setUnreadCount(0); }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const isActive = () => active;
    void refresh(isActive);
    const interval = setInterval(() => void refresh(isActive), 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [refresh]));

  async function openNotifications() {
    let active = true;
    await refresh(() => active);
    active = false;
    setIsOpen(true);
    setUnreadCount(0);
    if (isSupabaseConfigured) {
      const { data } = await requireSupabase().auth.getUser();
      if (data.user?.id) await AsyncStorage.setItem(`${LAST_SEEN_KEY}/${data.user.id}`, String(Date.now()));
    } else {
      await AsyncStorage.setItem(`${LAST_SEEN_KEY}/local-device`, String(Date.now()));
    }
  }

  function openForum() {
    setIsOpen(false);
    router.push('/tabs/forum');
  }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={unreadCount ? `Notificações, ${unreadCount} novas` : 'Notificações'} onPress={() => void openNotifications()} style={[styles.bell, inline ? styles.bellInline : { top: topInset }]}>
        <Ionicons name="notifications-outline" size={23} color={colors.primary} />
        {unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View> : null}
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setIsOpen(false)} transparent visible={isOpen}>
        <Pressable onPress={() => setIsOpen(false)} style={styles.backdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.title}>Notificações</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar notificações" onPress={() => setIsOpen(false)} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.mutedText} />
              </Pressable>
            </View>
            {items.length ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {items.map((item) => (
                  <Pressable key={item.id} onPress={openForum} style={styles.notification}>
                    <View style={styles.notificationIcon}><Ionicons name="chatbubble-outline" size={18} color={colors.primary} /></View>
                    <View style={styles.copy}>
                      <Text style={styles.message}><Text style={styles.author}>{item.author}</Text> comentou na sua publicação</Text>
                      {item.text ? <Text numberOfLines={2} style={styles.preview}>{item.text}</Text> : null}
                      <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={28} color={colors.mutedText} />
                <Text style={styles.emptyText}>Você ainda não recebeu comentários nas suas publicações.</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#D8E8FF', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', position: 'absolute', right: 18, width: 44, zIndex: 10 },
  bellInline: { marginLeft: 12, position: 'relative', right: undefined },
  badge: { alignItems: 'center', backgroundColor: colors.danger, borderColor: colors.white, borderRadius: 9, borderWidth: 1.5, height: 18, justifyContent: 'center', minWidth: 18, position: 'absolute', right: -4, top: -4 },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800', paddingHorizontal: 3 },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(17, 24, 39, 0.35)', flex: 1, justifyContent: 'center', padding: 22 },
  panel: { backgroundColor: colors.white, borderColor: '#D8E8FF', borderRadius: 20, borderWidth: 1, elevation: 8, maxHeight: '75%', maxWidth: 440, padding: 18, shadowColor: '#111827', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, width: '100%' },
  panelHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  title: { color: colors.primaryDark, fontSize: 19, fontWeight: '800' },
  closeButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  notification: { alignItems: 'center', borderTopColor: '#EAEEF5', borderTopWidth: 1, flexDirection: 'row', gap: 11, paddingVertical: 13 },
  notificationIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  copy: { flex: 1, gap: 3 },
  message: { color: colors.text, fontSize: 13 },
  author: { color: colors.primaryDark, fontWeight: '800' },
  preview: { color: colors.mutedText, fontSize: 12 },
  date: { color: colors.mutedText, fontSize: 10 },
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 28 },
  emptyText: { color: colors.mutedText, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
