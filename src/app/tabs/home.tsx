import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';

// Lista de imagens do carrossel exibido no topo da Home.
const BANNERS: ImageSourcePropType[] = [
  require('@/assets/banners/pessoaFit.jpg'),
  require('../../../assets/banners/medicoComida.jpg'),
  require('@/assets/banners/exercicioComendo.jpg'),
  require('@/assets/banners/comida.jpg')
];

// Define a tela inicial, exibida depois que a pessoa faz login (e completa o questionário, se for a primeira vez).
export default function HomeScreen() {
  // Guarda o índice (posição) da imagem do carrossel que está sendo mostrada agora. Começa em 0 (a primeira).
  const [bannerIndex, setBannerIndex] = useState(0);
  // Troca para a imagem anterior do carrossel; se estiver na primeira, volta para a última (efeito circular).
  function bannerAnterior() {
    setBannerIndex((atual) => (atual === 0 ? BANNERS.length - 1 : atual - 1));
  }

  // Troca para a próxima imagem do carrossel; se estiver na última, volta para a primeira (efeito circular).
  function proximoBanner() {
    setBannerIndex((atual) => (atual === BANNERS.length - 1 ? 0 : atual + 1));
  }

  // Monta a interface visual da tela.
  return (
    // View mais externa: ocupa a tela inteira e serve de base para a curva decorativa no rodapé.
    <View style={styles.screen}>
      {/* Cabeçalho fixo, igual em todas as abas internas. */}
      <Header />

      {/* ScrollView permite rolar o conteúdo caso ele não caiba na altura da tela. */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Bloco do avatar: um círculo cinza representando a foto de perfil (ainda sem foto real). */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            {/* Usa um emoji simples como ícone provisório de perfil. */}
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </View>

        {/* Cartão do carrossel: uma imagem grande com setas para trocar de foto. */}
        <View style={styles.bannerCard}>
          {/* Mostra a imagem correspondente ao índice atual do carrossel. */}
          <Image
            // Carrega diretamente a imagem local escolhida pelo índice do carrossel.
            source={BANNERS[bannerIndex]}
            style={styles.bannerImage}
          />

          {/* As setas só aparecem quando houver mais de uma imagem local no carrossel. */}
          {BANNERS.length > 1 ? (
            <>
              {/* Chama bannerAnterior para voltar uma posição na lista de imagens. */}
              <Pressable onPress={bannerAnterior} style={[styles.bannerArrow, styles.bannerArrowLeft]}>
                <Text style={styles.bannerArrowText}>‹</Text>
              </Pressable>

              {/* Chama proximoBanner para avançar uma posição na lista de imagens. */}
              <Pressable onPress={proximoBanner} style={[styles.bannerArrow, styles.bannerArrowRight]}>
                <Text style={styles.bannerArrowText}>›</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {/* Linha com os dois cartões de resumo, lado a lado. */}
        <View style={styles.cardsRow}>

          {/* Primeiro cartão: mostra a meta do dia em porcentagem. */}
          <Card>
            <Text style={styles.cardTitle}>Meta do Dia</Text>
            {/* Agrupa o emoji de alvo e o número da porcentagem na mesma linha. */}
            <View style={styles.cardInline}>
              <Text style={styles.cardEmoji}>🎯</Text>
              <Text style={styles.cardValue}>70%</Text>
            </View>
          </Card>

          {/* Segundo cartão: mostra a sequência de dias seguidos se exercitando. */}
          <Card>
            <Text style={styles.cardTitle}>Sequência</Text>
            <Text style={styles.cardText}>3 dias seguidos se exercitando 🔥</Text>
          </Card>

        </View>
      </ScrollView>

      {/* Forma azul arredondada, só decorativa, criando a curva no rodapé da tela. */}
      {/* pointerEvents="none" garante que ela não bloqueie toques nos elementos abaixo dela. */}
      <View pointerEvents="none" style={styles.wave} />
    </View>
  );
}

// Agrupa todos os estilos exclusivos desta tela.
const styles = StyleSheet.create({
  // Tela inteira, com fundo branco atrás de tudo (inclusive atrás da curva azul).
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Espaçamento do conteúdo dentro do ScrollView: espaço entre os blocos e nas bordas.
  content: {
    gap: 18,
    paddingBottom: 60,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  // Alinha o círculo do avatar à esquerda da tela.
  avatarWrapper: {
    alignItems: 'flex-start'
  },
  // Círculo cinza claro que serve de fundo para o ícone de perfil.
  avatar: {
    alignItems: 'center',
    backgroundColor: '#E4E7EC',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  // Tamanho do emoji usado como ícone de perfil.
  avatarIcon: {
    fontSize: 26
  },
  // Container do carrossel: cantos arredondados e "overflow: hidden" corta a imagem nas bordas.
  bannerCard: {
    borderRadius: 20,
    height: 190,
    overflow: 'hidden',
    position: 'relative'
  },
  // A imagem do carrossel ocupa 100% da largura e altura do cartão.
  bannerImage: {
    height: '100%',
    width: '100%'
  },
  // Estilo base dos botões de seta: círculo escuro semitransparente, centralizado verticalmente.
  bannerArrow: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    // Sobe metade da altura do botão para centralizá-lo no meio do banner.
    marginTop: -16,
    position: 'absolute',
    top: '50%',
    width: 32,
  },
  // Cola a seta esquerda na borda esquerda do cartão.
  bannerArrowLeft: {
    left: 10
  },
  // Cola a seta direita na borda direita do cartão.
  bannerArrowRight: {
    right: 10
  },
  // Estilo do símbolo "‹" ou "›" dentro dos botões de seta.
  bannerArrowText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700'
  },
  // Alinha os dois cartões lado a lado, com espaço entre eles.
  cardsRow: {
    flexDirection: 'row',
    gap: 14,

  },
  // Título pequeno dentro de cada cartão ("Meta do Dia" / "Sequência").
  cardTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '700'
  },
  // Alinha o emoji e o valor lado a lado, dentro do cartão de meta.
  cardInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  // Tamanho do emoji usado como ícone dentro dos cartões.
  cardEmoji: {
    fontSize: 22
  },
  // Estilo do número de porcentagem no cartão de meta do dia.
  cardValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800'
  },
  // Estilo do texto descritivo no cartão de sequência.
  cardText: {
    color: colors.text,
    fontSize: 12.5,
    textAlign: 'center'
  },
  // Forma azul arredondada no rodapé: um retângulo alto com os cantos superiores bem arredondados,
  // criando o efeito de "curva"/"onda" quando posicionado abaixo da borda visível da tela.
  wave: {
    backgroundColor: '#1800B8',
    borderTopLeftRadius: 300,
    borderTopRightRadius: 300,
    bottom: -40,
    height: 140,
    left: -40,
    position: 'absolute',
    right: -40
  },
});
