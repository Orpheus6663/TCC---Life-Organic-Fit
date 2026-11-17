
import { useCallback, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';
import { getTodayCalories } from '../../services/mealService';

// Lista de imagens do carrossel exibido no topo da Home.
const BANNERS: ImageSourcePropType[] = [
  require('@/assets/banners/pessoaFit.jpg'),
  require('../../../assets/banners/medicoComida.jpg'),
  require('@/assets/banners/exercicioComendo.jpg'),
  require('@/assets/banners/comida.jpg'),
];

export default function HomeScreen() {
  // Controla a imagem atual do carrossel.
  const [bannerIndex, setBannerIndex] = useState(0);

  // Guarda o total de calorias consumidas hoje.
  const [todayCalories, setTodayCalories] = useState(0);

  // Controla o carregamento das calorias.
  const [loadingCalories, setLoadingCalories] = useState(true);

  // Identifica se aconteceu algum erro ao consultar o Supabase.
  const [caloriesError, setCaloriesError] = useState(false);

  // Carrega novamente as calorias sempre que a Home recebe foco.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadCalories() {
        try {
          setLoadingCalories(true);
          setCaloriesError(false);

          const total = await getTodayCalories();

          if (active) {
            setTodayCalories(total);
          }
        } catch (error) {
          console.error('Erro ao carregar calorias:', error);

          if (active) {
            setCaloriesError(true);
          }
        } finally {
          if (active) {
            setLoadingCalories(false);
          }
        }
      }

      loadCalories();

      return () => {
        active = false;
      };
    }, [])
  );

  // Volta para a imagem anterior.
  function bannerAnterior() {
    setBannerIndex((atual) =>
      atual === 0 ? BANNERS.length - 1 : atual - 1
    );
  }

  // Avança para a próxima imagem.
  function proximoBanner() {
    setBannerIndex((atual) =>
      atual === BANNERS.length - 1 ? 0 : atual + 1
    );
  }

  return (
    <View style={styles.screen}>
      <Header />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar do usuário */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </View>

        {/* Carrossel de imagens */}
        <View style={styles.bannerCard}>
          <Image
            source={BANNERS[bannerIndex]}
            style={styles.bannerImage}
          />

          {BANNERS.length > 1 && (
            <>
              <Pressable
                onPress={bannerAnterior}
                style={[
                  styles.bannerArrow,
                  styles.bannerArrowLeft,
                ]}
              >
                <Text style={styles.bannerArrowText}>‹</Text>
              </Pressable>

              <Pressable
                onPress={proximoBanner}
                style={[
                  styles.bannerArrow,
                  styles.bannerArrowRight,
                ]}
              >
                <Text style={styles.bannerArrowText}>›</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Cartões de informações */}
        <View style={styles.cardsRow}>
          {/* Cartão de calorias do dia */}
          <Card>
            <Text style={styles.cardTitle}>
              KCAL DO DIA
            </Text>

            <View style={styles.cardInline}>
              <Text style={styles.cardEmoji}>🔥</Text>

              <Text style={styles.cardValue}>
                {loadingCalories
                  ? 'Carregando...'
                  : caloriesError
                    ? 'Indisponível'
                    : `${todayCalories.toLocaleString('pt-BR')} kcal`}
              </Text>
            </View>

            <Text style={styles.cardText}>
              Calorias registradas hoje
            </Text>
          </Card>

          {/* Cartão de sequência */}
          <Card>
            <Text style={styles.cardTitle}>
              Sequência
            </Text>

            <Text style={styles.cardText}>
              3 dias seguidos se exercitando 🔥
            </Text>
          </Card>
        </View>
      </ScrollView>

      {/* Forma azul decorativa no rodapé */}
      <View
        pointerEvents="none"
        style={styles.wave}
      />
    </View>
  );
}

// Estilos da tela inicial.
const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.white,
    flex: 1,
  },

  content: {
    gap: 18,
    paddingBottom: 60,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  avatarWrapper: {
    alignItems: 'flex-start',
  },

  avatar: {
    alignItems: 'center',
    backgroundColor: '#E4E7EC',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },

  avatarIcon: {
    fontSize: 26,
  },

  bannerCard: {
    borderRadius: 20,
    height: 190,
    overflow: 'hidden',
    position: 'relative',
  },

  bannerImage: {
    height: '100%',
    width: '100%',
  },

  bannerArrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    marginTop: -16,
    position: 'absolute',
    top: '50%',
    width: 32,
  },

  bannerArrowLeft: {
    left: 10,
  },

  bannerArrowRight: {
    right: 10,
  },

  bannerArrowText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },

  cardsRow: {
    flexDirection: 'row',
    gap: 14,
  },

  cardTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700',
  },

  cardInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  cardEmoji: {
    fontSize: 22,
  },

  cardValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  cardText: {
    color: colors.text,
    fontSize: 12.5,
    textAlign: 'center',
  },

  wave: {
    backgroundColor: '#1800B8',
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    bottom: -40,
    height: 140,
    left: -40,
    position: 'absolute',
    right: -40,
  },
});
