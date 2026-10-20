import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

// Cabeçalho fixo usado no topo de todas as telas internas (Home, Água, Refeições, etc.).
// Mostra a faixa azul escura, a faixa azul clara e, dentro dela, a logo e o nome da marca.
// Recebe o deslocamento da Home para encolher o cabeçalho junto com o scroll.
export function Header({ scrollY }: { scrollY?: Animated.Value }) {
  // Interpola as alturas para a faixa superior diminuir gradualmente ao rolar.
  const darkBarHeight = scrollY?.interpolate({ inputRange: [0, 120], outputRange: [26, 0], extrapolate: 'clamp' }) ?? 26;
  const lightBarPadding = scrollY?.interpolate({ inputRange: [0, 120], outputRange: [10, 0], extrapolate: 'clamp' }) ?? 10;
  const lightBarBottomPadding = scrollY?.interpolate({ inputRange: [0, 120], outputRange: [14, 0], extrapolate: 'clamp' }) ?? 14;
  const logoHeight = scrollY?.interpolate({ inputRange: [0, 120], outputRange: [50, 18], extrapolate: 'clamp' }) ?? 50;
  const logoWidth = scrollY?.interpolate({ inputRange: [0, 120], outputRange: [92, 34], extrapolate: 'clamp' }) ?? 92;
  const brandOpacity = scrollY?.interpolate({ inputRange: [0, 70], outputRange: [1, 0], extrapolate: 'clamp' }) ?? 1;
  const brandHeight = scrollY?.interpolate({ inputRange: [0, 70], outputRange: [17, 0], extrapolate: 'clamp' }) ?? 17;
  const brandMargin = scrollY?.interpolate({ inputRange: [0, 70], outputRange: [4, 0], extrapolate: 'clamp' }) ?? 4;
  return (
    // Agrupa as duas faixas coloridas, uma embaixo da outra.
    <View style={styles.container}>
      {/* Faixa fina azul escura no topo, só decorativa (sem texto ou imagem). */}
      <Animated.View style={[styles.darkBar, { height: darkBarHeight }]} />

      {/* Faixa azul clara logo abaixo, onde ficam a logo e o nome do app. */}
      <Animated.View style={[styles.lightBar, { paddingTop: lightBarPadding, paddingBottom: lightBarBottomPadding }]}>
        {/* Imagem da logo (os dois halteres), guardada na pasta assets. */}
        <Animated.Image
          accessibilityLabel="Logo Life Organic Fit"
          resizeMode="contain"
          source={require('../../assets/lifeOrganicFit.png')}
          style={[styles.logo, { height: logoHeight, width: logoWidth }]}
        />
        {/* Nome do app, escrito por extenso abaixo da logo. */}
        <Animated.Text style={[styles.brand, { height: brandHeight, marginTop: brandMargin, opacity: brandOpacity }]}>LIFE ORGANIC FIT</Animated.Text>
      </Animated.View>
    </View>
  );
}

// Agrupa todos os estilos usados neste componente.
const styles = StyleSheet.create({
  // A largura ocupa 100% da tela; a altura é definida pela soma das duas faixas internas.
  container: {
    width: '100%'
  },
  // Faixa escura: só cor de fundo e uma altura fixa pequena.
  darkBar: {
    backgroundColor: '#1800B8',
    height: 26
  },
  // Faixa clara: centraliza o conteúdo (logo + texto) e dá espaçamento interno.
  lightBar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingBottom: 14,
    paddingTop: 10
  },
  // Tamanho fixo da imagem da logo dentro da faixa clara.
  logo: {
    height: 50,
    width: 92
  },
  // Estilo do texto "LIFE ORGANIC FIT": cor escura, negrito, letras um pouco espaçadas.
  brand: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4
  },
});
