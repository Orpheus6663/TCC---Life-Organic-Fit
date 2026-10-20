import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { ThemeSurface } from '../../components/ThemeSurface';
import { colors } from '../../constants/colors';
import { isSupabaseConfigured, requireSupabase } from '../../lib/supabase';
import { deleteAccount, signOut } from '../../services/authService';

const avatars = [
  { id: 'vermelho', source: require('../../../assets/perfil/vermelho.png') },
  { id: 'verde', source: require('../../../assets/perfil/verde.png') },
  { id: 'turquesa', source: require('../../../assets/perfil/turquesa.png') },
  { id: 'rosa', source: require('../../../assets/perfil/rosa.png') },
  { id: 'marrom', source: require('../../../assets/perfil/marrom.png') },
  { id: 'laranja', source: require('../../../assets/perfil/laranja.png') },
] as const;

const profileOptions = [
  { icon: 'settings-outline', label: 'Configurações do app', section: 'settings' },
  { icon: 'lock-closed-outline', label: 'Privacidade', section: 'privacy' },
  { icon: 'construct-outline', label: 'Gerenciar Conta', section: 'account' },
  { icon: 'document-text-outline', label: 'Termos de uso', section: 'terms' },
  { icon: 'notifications-outline', label: 'Notificação', section: 'notifications' },
  { icon: 'sunny-outline', label: 'Modo de tela', section: 'appearance' },
  { icon: 'trash-outline', label: 'Excluir conta', section: 'delete' },
] as const;

export default function PerfilScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;
    async function loadProfile() {
      if (!isSupabaseConfigured) {
        if (isActive) {
          setError('Conecte o Supabase para carregar os dados do perfil.');
          setIsLoading(false);
        }
        return;
      }
      const client = requireSupabase();
      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        if (!isActive) return;
        setName(String(session?.user.user_metadata?.name ?? ''));
        setEmail(session?.user.email ?? '');
        setAvatarId(String(session?.user.user_metadata?.avatar_id ?? '') || null);
      });
      unsubscribe = () => authListener.subscription.unsubscribe();
      try {
        const { data, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (isActive) {
          setName(String(data.user?.user_metadata?.name ?? ''));
          setEmail(data.user?.email ?? '');
          setAvatarId(String(data.user?.user_metadata?.avatar_id ?? '') || null);
        }
      } catch (reason) {
        if (isActive) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o perfil.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    }
    void loadProfile();
    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  async function logout() {
    setIsSubmitting(true);
    setError('');
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível sair da conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function selectAvatar(id: string) {
    if (!isSupabaseConfigured) {
      setError('Entre na sua conta para salvar uma foto de perfil.');
      setIsAvatarPickerOpen(false);
      return;
    }
    try {
      const client = requireSupabase();
      const { data, error: updateError } = await client.auth.updateUser({ data: { avatar_id: id } });
      if (updateError) throw updateError;
      setAvatarId(String(data.user.user_metadata?.avatar_id ?? id));
      setError('');
      setIsAvatarPickerOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a foto de perfil.');
    }
  }

  // Confirma e apaga permanentemente a conta e os dados vinculados a ela.
  function confirmDeleteAccount() {
    if (!isSupabaseConfigured || !email) {
      setError('Entre na sua conta para solicitar a exclusão.');
      return;
    }
    Alert.alert('Excluir conta?', 'Sua conta, publicações, comentários, refeições e fotos serão removidos permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir conta', style: 'destructive', onPress: () => void performAccountDeletion() },
    ]);
  }

  // Chama a função protegida no servidor e retorna à tela de entrada após a exclusão.
  async function performAccountDeletion() {
    setIsSubmitting(true);
    setError('');
    try {
      await deleteAccount();
      router.replace('/auth/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a conta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedAvatar = avatars.find((avatar) => avatar.id === avatarId);

  return (
    <ThemeSurface><View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.accountCard}>
          <Pressable accessibilityRole="button" accessibilityLabel="Escolher foto de perfil" onPress={() => setIsAvatarPickerOpen(true)} style={styles.avatar}>
            {selectedAvatar ? <Image source={selectedAvatar.source} style={styles.avatarImage} /> : <Ionicons name="person" size={38} color="#FFFFFF" />}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color={colors.primary} />
            </View>
          </Pressable>
          <View style={styles.accountText}>
            {isLoading
              ? <ActivityIndicator color={colors.primary} />
              : <>
                <Text numberOfLines={1} style={styles.name}>{name || (email ? email.split('@')[0] : 'Meu perfil')}</Text>
                <Text numberOfLines={1} style={styles.email}>{email || 'Entre na sua conta para ver seu perfil.'}</Text>
              </>}
            <Pressable accessibilityRole="button" onPress={() => router.push('/configuracoes')}>
              <Text style={styles.editEmail}>Editar perfil e e-mail  ✎</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.logoutCard}>
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          {email
            ? <Button disabled={isSubmitting} onPress={logout}>{isSubmitting ? 'Saindo...' : 'Sair da conta'}</Button>
            : <Button onPress={() => router.push('/auth/login')}>Entrar ou criar conta</Button>}
        </View>

        <View style={styles.optionsCard}>
          {profileOptions.map((option, index) => <Pressable
            key={option.label}
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={() => option.section === 'delete'
              ? confirmDeleteAccount()
              : router.push({ pathname: '/preferencias', params: { section: option.section } })}
            style={[styles.optionRow, index < profileOptions.length - 1 && styles.optionDivider]}
          >
            <Ionicons name={option.icon} size={21} color={option.section === 'delete' ? colors.danger : '#303030'} />
            <Text style={[styles.optionLabel, option.section === 'delete' && styles.deleteLabel]}>{option.label}</Text>
            {option.section !== 'delete' ? <Ionicons name="chevron-forward" size={17} color="#777777" /> : null}
          </Pressable>)}
        </View>
      </ScrollView>
      <Modal visible={isAvatarPickerOpen} transparent animationType="fade" onRequestClose={() => setIsAvatarPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.avatarModal}>
            <Text style={styles.modalTitle}>Escolha sua foto</Text>
            <View style={styles.avatarGrid}>
              {avatars.map((avatar) => (
                <Pressable key={avatar.id} accessibilityRole="button" accessibilityLabel={`Selecionar avatar ${avatar.id}`} onPress={() => void selectAvatar(avatar.id)} style={[styles.avatarChoice, avatar.id === avatarId && styles.selectedAvatarChoice]}>
                  <Image source={avatar.source} style={styles.choiceImage} />
                </Pressable>
              ))}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setIsAvatarPickerOpen(false)}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View></ThemeSurface>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAFAFA',
    flex: 1
  },
  content: {
    gap: 28,
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 28
  },
  accountCard: {
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 14,
    minHeight: 150,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#BDBDBD',
    borderColor: '#D7D7D7',
    borderRadius: 40,
    borderWidth: 2,
    height: 76,
    justifyContent: 'center',
    width: 76
  },
  avatarImage: { borderRadius: 38, height: '100%', width: '100%' },
  modalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', flex: 1, justifyContent: 'center', padding: 24 },
  avatarModal: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 20, gap: 20, padding: 24, width: '100%' },
  modalTitle: { color: '#252525', fontSize: 18, fontWeight: '800' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center' },
  avatarChoice: { borderColor: 'transparent', borderRadius: 38, borderWidth: 3, height: 72, overflow: 'hidden', width: 72 },
  selectedAvatarChoice: { borderColor: colors.primary },
  choiceImage: { height: '100%', width: '100%' },
  cancelText: { color: colors.mutedText, fontSize: 15, fontWeight: '600' },
  editBadge: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    right: -1,
    top: 1,
    width: 20
  },
  accountText: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  email: {
    color: '#252525',
    fontSize: 15,
    fontWeight: '600'
  },
  name: {
    color: '#252525',
    fontSize: 17,
    fontWeight: '800'
  },
  editEmail: {
    color: '#989898',
    fontSize: 14
  },
  optionsCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 23,
    paddingHorizontal: 18,
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 37
  },
  optionDivider: {
    borderBottomColor: '#8C8C8C',
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  optionLabel: {
    color: '#242424',
    flex: 1,
    fontSize: 16
  },
  deleteLabel: { color: colors.danger },
  logoutCard: {
    backgroundColor: '#F0F0F0',
    borderRadius: 22,
    padding: 12
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center'
  }
});
