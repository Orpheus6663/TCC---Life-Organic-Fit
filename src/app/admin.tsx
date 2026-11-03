import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ThemeSurface } from '../components/ThemeSurface';
import { colors } from '../constants/colors';
import { requireSupabase } from '../lib/supabase';
import { dismissForumReport, loadForumPosts, loadForumReports, type ForumPost, type ForumReport } from '../services/forumService';
import { loadAdminAccounts, removeAdminAccount, removeAdminPost, type AdminAccount } from '../services/adminService';

type AdminSection = 'reports' | 'posts' | 'accounts';

// Tela de moderação protegida por papel administrativo conferido pelo Supabase.
export default function AdminScreen() {
  const [section, setSection] = useState<AdminSection>('reports');
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [hasMoreAccounts, setHasMoreAccounts] = useState(false);

  // Confirma o papel do usuário pela sessão remota antes de exibir qualquer dado moderado.
  useEffect(() => {
    let active = true;
    async function checkAdmin() {
      try {
        const { data, error: authError } = await requireSupabase().auth.getUser();
        if (authError) throw authError;
        const { data: refreshed, error: refreshError } = await requireSupabase().auth.refreshSession();
        if (refreshError) throw refreshError;
        if (active) setIsAdmin(refreshed.session?.user?.app_metadata?.role === 'admin');
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível verificar a conta.');
      } finally {
        if (active) setIsChecking(false);
      }
    }
    void checkAdmin();
    return () => { active = false; };
  }, []);

  // Carrega somente os dados da seção escolhida; as políticas do banco também validam o acesso.
  const refresh = useCallback(async (target = section, page = 1) => {
    if (!isAdmin) return;
    setIsLoading(true);
    setError('');
    try {
      if (target === 'reports') {
        const [nextReports, nextPosts] = await Promise.all([loadForumReports(), loadForumPosts()]);
        setReports(nextReports);
        setPosts(nextPosts);
      } else if (target === 'posts') {
        setPosts(await loadForumPosts());
      } else {
        const result = await loadAdminAccounts(page);
        setAccounts((current) => page === 1 ? result.users : [...current, ...result.users]);
        setHasMoreAccounts(result.hasMore);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados de moderação.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, section]);

  useEffect(() => {
    if (isAdmin) void refresh(section);
  }, [isAdmin, section, refresh]);

  // Descarta a denúncia e atualiza a lista de pendências.
  async function dismiss(report: ForumReport) {
    try {
      await dismissForumReport(report.id);
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível resolver a denúncia.');
    }
  }

  // Confirma e remove a publicação, inclusive quando veio de uma denúncia.
  function confirmDeletePost(postId: string) {
    Alert.alert('Apagar publicação?', 'A publicação e seus comentários serão removidos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => void (async () => {
        try {
          await removeAdminPost(postId);
          setPosts((current) => current.filter((post) => post.id !== postId));
          setReports((current) => current.filter((report) => report.postId !== postId));
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível apagar a publicação.');
        }
      })() },
    ]);
  }

  // Confirma a remoção da conta por uma função Edge que usa a chave privada só no servidor.
  function confirmDeleteAccount(account: AdminAccount) {
    Alert.alert('Excluir conta?', `A conta ${account.email} e os dados vinculados serão removidos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void (async () => {
        try {
          await removeAdminAccount(account.id);
          setAccounts((current) => current.filter((user) => user.id !== account.id));
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conta.');
        }
      })() },
    ]);
  }

  return (
    <ThemeSurface><View style={styles.screen}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Administração</Text>
          <Text style={styles.subtitle}>Moderação da comunidade</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Atualizar" onPress={() => void refresh()} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {isChecking || isLoading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
      {!isChecking && !isAdmin ? <View style={styles.notice}><Text style={styles.errorText}>{error || 'Esta área é restrita à conta administradora.'}</Text></View> : null}
      {error && isAdmin ? <Text accessibilityLiveRegion="polite" style={styles.errorText}>{error}</Text> : null}

      {isAdmin ? <>
        <View style={styles.tabs}>
          {([
            ['reports', 'Denúncias'], ['posts', 'Publicações'], ['accounts', 'Contas'],
          ] as const).map(([id, label]) => <Pressable key={id} accessibilityRole="button" onPress={() => setSection(id)} style={[styles.tab, section === id && styles.activeTab]}>
            <Text style={[styles.tabText, section === id && styles.activeTabText]}>{label}</Text>
          </Pressable>)}
        </View>
        <ScrollView contentContainerStyle={styles.list}>
          {section === 'reports' ? reports.map((report) => {
            const post = posts.find((item) => item.id === report.postId);
            return <View key={report.id} style={styles.card}>
              <Text style={styles.cardEyebrow}>Denúncia · {new Date(report.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.cardTitle}>{report.reason}</Text>
              <Text numberOfLines={4} style={styles.cardBody}>{post?.text || 'Esta publicação não está mais disponível.'}</Text>
              <View style={styles.actions}>
                {post ? <Pressable accessibilityRole="button" onPress={() => confirmDeletePost(post.id)} style={styles.dangerButton}><Text style={styles.dangerButtonText}>Apagar publicação</Text></Pressable> : null}
                <Pressable accessibilityRole="button" onPress={() => void dismiss(report)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Resolver denúncia</Text></Pressable>
              </View>
            </View>;
          }) : null}
          {section === 'posts' ? posts.map((post) => <View key={post.id} style={styles.card}>
            <Text style={styles.cardEyebrow}>{post.authorName} · {new Date(post.createdAt).toLocaleDateString()}</Text>
            <Text numberOfLines={5} style={styles.cardBody}>{post.text || 'Publicação com foto'}</Text>
            <Pressable accessibilityRole="button" onPress={() => confirmDeletePost(post.id)} style={styles.dangerButton}><Text style={styles.dangerButtonText}>Apagar publicação</Text></Pressable>
          </View>) : null}
          {section === 'accounts' ? accounts.map((account) => <View key={account.id} style={styles.card}>
            <Text style={styles.cardTitle}>{account.email || 'Conta sem e-mail'}</Text>
            <Text style={styles.cardEyebrow}>Criada em {new Date(account.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.cardEyebrow}>{account.isAdmin ? 'Administradora' : `Último acesso: ${account.lastSignInAt ? new Date(account.lastSignInAt).toLocaleDateString() : 'nunca'}`}</Text>
            {!account.isAdmin ? <Pressable accessibilityRole="button" onPress={() => confirmDeleteAccount(account)} style={styles.dangerButton}><Text style={styles.dangerButtonText}>Excluir conta</Text></Pressable> : null}
          </View>) : null}
          {section === 'reports' && reports.length === 0 && !isLoading ? <Text style={styles.empty}>Nenhuma denúncia pendente.</Text> : null}
          {section === 'posts' && posts.length === 0 && !isLoading ? <Text style={styles.empty}>Nenhuma publicação encontrada.</Text> : null}
          {section === 'accounts' && accounts.length === 0 && !isLoading ? <Text style={styles.empty}>Nenhuma conta encontrada.</Text> : null}
          {section === 'accounts' && hasMoreAccounts ? <Pressable accessibilityRole="button" onPress={() => void refresh('accounts', Math.floor(accounts.length / 100) + 1)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Carregar mais contas</Text></Pressable> : null}
        </ScrollView>
      </> : null}
    </View></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F4F8FC', flex: 1, paddingTop: 48 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  backButton: { alignItems: 'center', height: 42, justifyContent: 'center', width: 36 },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.mutedText, fontSize: 12, marginTop: 2 },
  refreshButton: { alignItems: 'center', backgroundColor: '#E4F0FC', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  loader: { margin: 16 },
  notice: { backgroundColor: colors.white, borderRadius: 16, margin: 16, padding: 16 },
  errorText: { color: colors.danger, paddingHorizontal: 16, paddingVertical: 8 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  tab: { alignItems: 'center', backgroundColor: colors.white, borderColor: '#D8E6F5', borderRadius: 18, borderWidth: 1, flex: 1, paddingVertical: 10 },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  activeTabText: { color: colors.white },
  list: { gap: 12, padding: 14, paddingBottom: 32 },
  card: { backgroundColor: colors.white, borderColor: '#E0EAF4', borderRadius: 16, borderWidth: 1, gap: 8, padding: 14 },
  cardEyebrow: { color: colors.mutedText, fontSize: 11 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cardBody: { color: colors.text, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  dangerButton: { alignSelf: 'flex-start', backgroundColor: '#FFF0EF', borderRadius: 12, marginTop: 4, paddingHorizontal: 12, paddingVertical: 9 },
  dangerButtonText: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  secondaryButton: { alignSelf: 'flex-start', backgroundColor: '#EAF3FC', borderRadius: 12, marginTop: 4, paddingHorizontal: 12, paddingVertical: 9 },
  secondaryButtonText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  empty: { color: colors.mutedText, padding: 22, textAlign: 'center' },
});
