import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Appearance, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../constants/colors';
import { ThemeSurface } from '../components/ThemeSurface';
import type { AppLanguage } from '../i18n/language';
import { useAppLanguage } from '../i18n/language';

type ScreenMode = 'light' | 'dark';
type AppLanguage = 'pt-BR' | 'en';

const NOTIFICATIONS_KEY = '@lifeorganicfit/notifications-enabled';
const SCREEN_MODE_KEY = '@lifeorganicfit/screen-mode';

const pageTitles: Record<string, string> = {
  settings: 'Configurações do app',
  account: 'Gerenciar conta',
  privacy: 'Privacidade',
  terms: 'Termos de uso',
  notifications: 'Notificações',
  appearance: 'Modo de tela',
  language: 'Idioma',
  help: 'Central de ajuda',
};

export default function PreferencesScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const section = Array.isArray(params.section) ? params.section[0] : params.section ?? 'settings';
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [screenMode, setScreenMode] = useState<ScreenMode>('light');
  // Shares the selected language with all app screens.
  const { language: appLanguage, setLanguage } = useAppLanguage();

  // Loads the preferences saved locally and applies the selected app appearance.
  useEffect(() => {
    let isActive = true;
    async function loadPreferences() {
      const [savedNotifications, savedMode] = await Promise.all([
        AsyncStorage.getItem(NOTIFICATIONS_KEY),
        AsyncStorage.getItem(SCREEN_MODE_KEY),
      ]);
      if (!isActive) return;
      if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true');
      const mode: ScreenMode = savedMode === 'dark' ? 'dark' : 'light';
      setScreenMode(mode);
      Appearance.setColorScheme(mode);
    }
    void loadPreferences();
    return () => { isActive = false; };
  }, []);

  // Saves the notification preference on this device.
  async function updateNotifications(enabled: boolean) {
    setNotificationsEnabled(enabled);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(enabled));
  }

  // Saves and applies the selected light or dark appearance.
  async function updateScreenMode(mode: ScreenMode) {
    setScreenMode(mode);
    Appearance.setColorScheme(mode);
    await AsyncStorage.setItem(SCREEN_MODE_KEY, mode);
  }

  // Saves the selected language on this device.
  async function updateLanguage(language: AppLanguage) {
    await setLanguage(language);
  }

  const title = pageTitles[section] ?? 'Configurações do app';
  const isDark = screenMode === 'dark';

  return (
    <ThemeSurface><View style={[styles.screen, isDark && styles.darkScreen]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Returns to the profile page from every profile preference screen. */}
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={isDark ? colors.white : colors.text} />
          <Text style={[styles.backText, isDark && styles.darkText]}>Perfil</Text>
        </Pressable>
        <Text style={[styles.title, isDark && styles.darkText]}>{title}</Text>

        {/* Permite escolher e salvar o idioma preferido neste aparelho. */}
        {section === 'language' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Escolha o idioma</Text>
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: appLanguage === 'pt-BR' }} onPress={() => void updateLanguage('pt-BR')} style={[styles.languageRow, appLanguage === 'pt-BR' && styles.selectedLanguageRow]}>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>Português (Brasil)</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>Português</Text>
              </View>
              {appLanguage === 'pt-BR' ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <Ionicons name="ellipse-outline" size={22} color={colors.mutedText} />}
            </Pressable>
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: appLanguage === 'en' }} onPress={() => void updateLanguage('en')} style={[styles.languageRow, appLanguage === 'en' && styles.selectedLanguageRow]}>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>English</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>English</Text>
              </View>
              {appLanguage === 'en' ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : <Ionicons name="ellipse-outline" size={22} color={colors.mutedText} />}
            </Pressable>
          </View>
        ) : null}

        {section === 'help' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Como podemos ajudar?</Text>
            <View style={styles.helpItem}>
              <Text style={[styles.rowTitle, isDark && styles.darkText]}>Como altero minha foto de perfil?</Text>
              <Text style={[styles.body, isDark && styles.darkMuted]}>Abra Perfil e toque na foto para escolher outro avatar.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={[styles.rowTitle, isDark && styles.darkText]}>Como uso o fórum?</Text>
              <Text style={[styles.body, isDark && styles.darkMuted]}>Acesse a aba Fórum para ver publicações, curtir, comentar e compartilhar uma publicação.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={[styles.rowTitle, isDark && styles.darkText]}>A NutriIA não responde. O que faço?</Text>
              <Text style={[styles.body, isDark && styles.darkMuted]}>Confirme que o computador que executa o app e o celular estão na mesma rede e que o Ollama está aberto. Inicie o projeto com npm start.</Text>
            </View>
            <View style={styles.helpItem}>
              <Text style={[styles.rowTitle, isDark && styles.darkText]}>Como ativo o tema escuro?</Text>
              <Text style={[styles.body, isDark && styles.darkMuted]}>Em Perfil, abra Modo de tela e ative “Deixar o app escuro”.</Text>
            </View>
          </View>
        ) : null}

        {section === 'privacy' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Seus dados no aplicativo</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>O Life Organic Fit usa os dados da sua conta para identificar seu perfil e sincronizar suas informações.</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>Publicações, comentários e fotos do fórum ficam visíveis para as pessoas que usam o fórum. Informações de refeições e questionário ficam vinculadas à sua conta.</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>Você pode sair da conta pelo Perfil. Para remover permanentemente a conta e os dados vinculados, use “Excluir conta”.</Text>
          </View>
        ) : null}

        {section === 'terms' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Uso do aplicativo</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>O aplicativo oferece ferramentas de organização de refeições, acompanhamento de progresso e conversa comunitária.</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>As informações do aplicativo são gerais e não substituem avaliação, diagnóstico ou orientação de profissionais de saúde.</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>Ao participar do fórum, publique conteúdo respeitoso e não compartilhe dados pessoais ou informações de saúde de outras pessoas sem autorização.</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>Você pode solicitar a exclusão da sua conta a qualquer momento na tela Perfil.</Text>
          </View>
        ) : null}

        {section === 'notifications' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Avisos e lembretes</Text>
            <View style={styles.preferenceRow}>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>Permitir notificações</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>Guarda sua preferência para os avisos do aplicativo.</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={(value) => void updateNotifications(value)} trackColor={{ true: colors.primary }} />
            </View>
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={styles.linkButton}>
              <Text style={styles.linkText}>Abrir configurações do celular</Text>
              <Ionicons name="open-outline" size={17} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {section === 'appearance' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            {/* One switch controls the full light/dark choice. */}
            <View style={styles.darkModeRow}>
              <View style={[styles.modeIcon, isDark && styles.modeIconDark]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={colors.primary} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>Deixar o app escuro</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>{isDark ? 'O tema escuro está ativado.' : 'O tema claro está ativado.'}</Text>
              </View>
              <Switch
                accessibilityLabel="Deixar o app escuro"
                value={screenMode === 'dark'}
                onValueChange={(enabled) => void updateScreenMode(enabled ? 'dark' : 'light')}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        ) : null}

        {section === 'account' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Conta</Text>
            <Text style={[styles.body, isDark && styles.darkMuted]}>Edite seu nome e e-mail nas configurações da conta.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/configuracoes')} style={styles.linkButton}>
              <Text style={styles.linkText}>Editar perfil e e-mail</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.primary} />
            </Pressable>
          </View>
        ) : null}

        {section === 'settings' ? (
          <View style={[styles.card, isDark && styles.darkCard]}>
            <Text style={[styles.cardTitle, isDark && styles.darkText]}>Preferências do app</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/preferencias', params: { section: 'language' } })} style={styles.settingLink}>
              <View style={[styles.modeIcon, isDark && styles.modeIconDark]}>
                <Ionicons name="language-outline" size={21} color={colors.primary} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>Idioma</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>{appLanguage === 'en' ? 'English' : 'Português (Brasil)'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#C2CBD5' : colors.mutedText} />
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/preferencias', params: { section: 'help' } })} style={styles.settingLink}>
              <View style={[styles.modeIcon, isDark && styles.modeIconDark]}>
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.preferenceCopy}>
                <Text style={[styles.rowTitle, isDark && styles.darkText]}>Central de ajuda</Text>
                <Text style={[styles.body, isDark && styles.darkMuted]}>Dúvidas e orientações sobre o app</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={isDark ? '#C2CBD5' : colors.mutedText} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View></ThemeSurface>
  );
}

// Groups layout and color rules shared by the profile preference pages.
const styles = StyleSheet.create({
  screen: { backgroundColor: '#EAF4FF', flex: 1 },
  darkScreen: { backgroundColor: '#121820' },
  content: { flexGrow: 1, gap: 20, padding: 20, paddingTop: 50 },
  backButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, minHeight: 40 },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  title: { color: colors.primary, fontSize: 25, fontWeight: '800' },
  // Cards use a pale blue surface and border to match the app's visual identity.
  card: { backgroundColor: '#F8FBFF', borderColor: '#D4E7FA', borderRadius: 23, borderWidth: 1, gap: 15, padding: 18 },
  darkCard: { backgroundColor: '#202A35' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  body: { color: colors.mutedText, fontSize: 14, lineHeight: 21 },
  darkText: { color: colors.white },
  darkMuted: { color: '#C2CBD5' },
  preferenceRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  // Linha selecionável para cada idioma disponível.
  languageRow: { alignItems: 'center', borderColor: 'transparent', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 12, minHeight: 58, paddingHorizontal: 10 },
  // Realça com azul claro o idioma atualmente selecionado.
  selectedLanguageRow: { backgroundColor: '#EAF4FF', borderColor: '#B7D7F4' },
  // Agrupa pergunta e resposta na central de ajuda.
  helpItem: { borderBottomColor: '#D8DDE3', borderBottomWidth: StyleSheet.hairlineWidth, gap: 6, paddingBottom: 12 },
  // Linha navegável para as opções das configurações do app.
  settingLink: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 58 },
  preferenceCopy: { flex: 1, gap: 4 },
  darkModeRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 60 },
  modeIcon: { alignItems: 'center', backgroundColor: '#E3EFFB', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  modeIconDark: { backgroundColor: '#334559' },
  rowTitle: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '600' },
  linkButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, minHeight: 40 },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
