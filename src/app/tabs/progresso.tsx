import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { colors } from '../../constants/colors';

const weeklyData = {
  'Última semana': [35, 58, 44, 72, 50, 83, 62],
  'Essa semana': [48, 66, 39, 78, 55, 30, 20],
};

// Os números abaixo são exemplos locais até os registros serem ligados ao banco.
export default function ProgressoScreen() {
  const [calories, setCalories] = useState(1200);
  const [period, setPeriod] = useState<keyof typeof weeklyData>('Essa semana');
  const targetCalories = 2200;
  const caloriePercent = Math.min(Math.round((calories / targetCalories) * 100), 100);

  // Botão de demonstração: soma 100 kcal enquanto a tela ainda usa dados locais.
  function addCalories() {
    setCalories((current) => current + 100);
  }

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identifica os dados mostrados como o resumo de hoje. */}
        <View style={styles.todayRow}>
          <View style={styles.todayBadge}><Text style={styles.todayText}>Hoje</Text></View>
        </View>

        {/* Cartão principal com calorias e indicador circular da meta diária. */}
        <View style={styles.calorieCard}>
          <Text style={styles.cardLabel}>KCAL</Text>
          <View style={styles.calorieRing}>
            <View style={styles.ringCenter}>
              <Text style={styles.percent}>{caloriePercent}%</Text>
              <Text style={styles.calorieAmount}>{calories.toLocaleString('pt-BR')} kcal</Text>
              <Pressable accessibilityLabel="Adicionar 100 quilocalorias" accessibilityRole="button" onPress={addCalories} style={styles.addButton}>
                <Ionicons name="add" color={colors.white} size={19} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Cartões menores com o total de passos e exercícios do dia. */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeading}><Ionicons name="walk-outline" size={18} color={colors.primaryDark} /><Text style={styles.statLabel}>Passos</Text></View>
            <Text style={styles.statValue}>99</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeading}><Ionicons name="barbell-outline" size={18} color={colors.primaryDark} /><Text style={styles.statLabel}>Exercícios</Text></View>
            <Text style={styles.statValue}>250 <Text style={styles.statUnit}>kcal</Text></Text>
            <Text style={styles.exerciseTime}>22 min</Text>
          </View>
        </View>

        {/* Seletor de período do resumo semanal. */}
        <Text style={styles.progressTitle}>Progressos</Text>
        <View style={styles.periodSelector}>
          {(Object.keys(weeklyData) as (keyof typeof weeklyData)[]).map((item) => {
            const selected = period === item;
            return (
              <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setPeriod(item)} style={[styles.periodButton, selected && styles.periodButtonSelected]}>
                <Text style={[styles.periodText, selected && styles.periodTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Gráfico demonstrativo: cada coluna representa um dia da semana. */}
        <View style={styles.chartCard}>
          {weeklyData[period].map((height, index) => (
            <View key={`${period}-${index}`} style={styles.chartColumn}>
              <View style={styles.chartTrack}>
                <View style={[styles.chartBar, { height: `${height}%` }]} />
              </View>
              <Text style={styles.chartDay}>{['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][index]}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.demoNote}>Valores ilustrativos — seus dados serão exibidos quando forem conectados.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Define os estilos visuais do elemento "screen".
  screen: {
    backgroundColor: colors.white,
    flex: 1
  },
  // Define os estilos visuais do elemento "content".
  content: {
    gap: 12,
    paddingBottom: 22,
    paddingHorizontal: 16,
    paddingTop: 14
  },
  // Define os estilos visuais do elemento "todayRow".
  todayRow: {
    alignItems: 'flex-start'
  },
  // Define os estilos visuais do elemento "todayBadge".
  todayBadge: {
    backgroundColor: '#83CFF2',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  // Define os estilos visuais do elemento "todayText".
  todayText: {
    color: '#14324A',
    fontSize: 13,
    fontWeight: '600'
  },
  // Define os estilos visuais do elemento "calorieCard".
  calorieCard: {
    alignItems: 'center',
    backgroundColor: '#82C9EF',
    borderRadius: 22,
    elevation: 3,
    height: 190,
    paddingHorizontal: 18,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4
  },
  // Define os estilos visuais do elemento "cardLabel".
  cardLabel: {
    alignSelf: 'flex-start',
    color: '#173247',
    fontSize: 14,
    fontWeight: '700'
  },
  // Define os estilos visuais do elemento "calorieRing".
  calorieRing: {
    alignItems: 'center',
    backgroundColor: '#7187F7',
    borderRadius: 58,
    height: 116,
    justifyContent: 'center',
    marginTop: 1,
    padding: 7,
    width: 116
  },
  // Define os estilos visuais do elemento "ringCenter".
  ringCenter: {
    alignItems: 'center',
    backgroundColor: '#070A16',
    borderRadius: 52,
    flex: 1,
    justifyContent: 'center',
    width: '100%'
  },
  // Define os estilos visuais do elemento "percent".
  percent: {
    color: colors.white,
    fontSize: 21,
    fontWeight: '800'
  },
  // Define os estilos visuais do elemento "calorieAmount".
  calorieAmount: {
    color: colors.white,
    fontSize: 11,
    marginTop: 1
  },
  // Define os estilos visuais do elemento "addButton".
  addButton: {
    alignItems: 'center',
    backgroundColor: '#7187F7',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    marginTop: 5,
    width: 22
  },
  // Define os estilos visuais do elemento "statsRow".
  statsRow: {
    flexDirection: 'row',
    gap: 12
  },
  // Define os estilos visuais do elemento "statCard".
  statCard: {
    alignItems: 'center',
    backgroundColor: '#82C9EF',
    borderRadius: 20,
    elevation: 3,
    flex: 1,
    minHeight: 92,
    paddingHorizontal: 10,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4
  },
  // Define os estilos visuais do elemento "statHeading".
  statHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5
  },
  // Define os estilos visuais do elemento "statLabel".
  statLabel: {
    color: '#173247',
    fontSize: 13,
    fontWeight: '700'
  },
  // Define os estilos visuais do elemento "statValue".
  statValue: {
    color: '#173247',
    fontSize: 16,
    marginTop: 9
  },
  // Define os estilos visuais do elemento "statUnit".
  statUnit: {
    fontSize: 12
  },
  // Define os estilos visuais do elemento "exerciseTime".
  exerciseTime: {
    color: '#173247',
    fontSize: 12,
    marginTop: 3
  },
  // Define os estilos visuais do elemento "progressTitle".
  progressTitle: {
    color: '#344054',
    fontSize: 14,
    marginLeft: 10,
    marginTop: 2
  },
  // Define os estilos visuais do elemento "periodSelector".
  periodSelector: {
    backgroundColor: '#1800B8',
    borderRadius: 22,
    flexDirection: 'row',
    padding: 5
  },
  // Define os estilos visuais do elemento "periodButton".
  periodButton: {
    alignItems: 'center',
    borderRadius: 18,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 5
  },
  // Define os estilos visuais do elemento "periodButtonSelected".
  periodButtonSelected: {
    backgroundColor: '#3B2ACB'
  },
  // Define os estilos visuais do elemento "periodText".
  periodText: {
    color: '#D9D5FF',
    fontSize: 13,
    fontWeight: '600'
  },
  // Define os estilos visuais do elemento "periodTextSelected".
  periodTextSelected: {
    color: colors.white
  },
  // Define os estilos visuais do elemento "chartCard".
  chartCard: {
    alignItems: 'flex-end',
    backgroundColor: '#F4F8FC',
    borderRadius: 18,
    flexDirection: 'row',
    height: 105,
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 12
  },
  // Define os estilos visuais do elemento "chartColumn".
  chartColumn: {
    alignItems: 'center',
    flex: 1,
    gap: 5,
    height: '100%'
  },
  // Define os estilos visuais do elemento "chartTrack".
  chartTrack: {
    backgroundColor: '#DFEAF3',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 14
  },
  // Define os estilos visuais do elemento "chartBar".
  chartBar: {
    backgroundColor: '#4D93B9',
    borderRadius: 6,
    width: '100%'
  },
  // Define os estilos visuais do elemento "chartDay".
  chartDay: {
    color: colors.mutedText,
    fontSize: 10
  },
  // Define os estilos visuais do elemento "demoNote".
  demoNote: {
    color: colors.mutedText,
    fontSize: 11,
    textAlign: 'center'
  },
});
