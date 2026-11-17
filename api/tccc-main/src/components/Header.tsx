import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

// Cabeçalho fixo usado no topo de todas as telas internas (Home, Água, Refeições, etc.).
// Mostra a faixa azul escura, a faixa azul clara e, dentro dela, a logo e o nome da marca.
export function Header() {
  return (
    // Agrupa as duas faixas coloridas, uma embaixo da outra.
    <View style={styles.container}>
      {/* Faixa fina azul escura no topo, só decorativa (sem texto ou imagem). */}
      <View style={styles.darkBar} />

      {/* Faixa azul clara logo abaixo, onde ficam a logo e o nome do app. */}
      <View style={styles.lightBar}>
        {/* Imagem da logo (os dois halteres), guardada na pasta assets. */}
        <Image
          accessibilityLabel="Logo Life Organic Fit"
          resizeMode="contain"
          source={require('../../assets/lifeOrganicFit.png')}
          style={styles.logo}
        />
        {/* Nome do app, escrito por extenso abaixo da logo. */}
        <Text style={styles.brand}>LIFE ORGANIC FIT</Text>
      </View>
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
    backgroundColor: colors.lightBlue,
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
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 4
  },
});