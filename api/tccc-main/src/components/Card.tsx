import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/colors';

// Define quais propriedades o componente Card aceita: apenas o conteúdo de dentro dele.
type CardProps = { children: ReactNode };

// Cartão genérico: fundo azul clarinho, cantos arredondados e uma sombra leve.
// Serve de "molde" para os blocos de informação da Home, como "Meta do Dia" e "Sequência".
export function Card({ children }: CardProps) {
  // Desenha uma View estilizada e coloca dentro dela o que for passado como "children".
  return <View style={styles.card}>{children}</View>;
}

// Agrupa o estilo do cartão em um só lugar.
const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "card".
  card: {
    // Cor de fundo azul clarinho, igual à paleta do app.
    backgroundColor: colors.lightBlue,
    // Cantos bem arredondados, para o visual suave dos cartões.
    borderRadius: 18,
    // Faz o cartão dividir o espaço igualmente quando colocado ao lado de outro (flexbox).
    flex: 1,
    // Espaçamento interno entre a borda do cartão e seu conteúdo.
    padding: 16,
    // Centraliza o conteúdo (texto, ícones) horizontalmente dentro do cartão.
    alignItems: 'center',
    // Espaço entre os itens internos do cartão (título, valor, etc.).
    gap: 8,
    // Sombra suave para dar profundidade no iOS.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    // Sombra equivalente para Android (iOS ignora esta propriedade).
    elevation: 2,
  },
});
