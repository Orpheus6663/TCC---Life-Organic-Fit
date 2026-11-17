import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/colors';

function Dumbbell() {
  return (
    <View style={styles.dumbbell}>
      <View style={[styles.weight, styles.weightOuter]} />
      <View style={styles.weight} />
      <View style={styles.bar} />
      <View style={styles.weight} />
      <View style={[styles.weight, styles.weightOuter]} />
    </View>
  );
}

export function AuthBrand() {
  return (
    <View style={styles.brand} accessibilityLabel="Life Organic Fit">
      <View style={styles.dumbbells}><Dumbbell /><Dumbbell /></View>
      <Text style={styles.name}>LIFE ORGANIC FIT</Text>
      <Text style={styles.tagline}>SEU BEM-ESTAR EM MOVIMENTO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { 
    alignItems: 'center'
 },

  dumbbells: {
     flexDirection: 'row', 
     gap: 11, 
     marginBottom: 12 
  },
  
  dumbbell: { 
     alignItems: 'center', 
     flexDirection: 'row', 
     height: 31 },
  
  weight: { 
    backgroundColor: colors.mediumBlue, 
    borderRadius: 4, 
    height: 22, 
    marginHorizontal: 1, 
    width: 7 
  },

  weightOuter: { 
    backgroundColor: colors.primary, 
    height: 30, 
    width: 8 
  },
  
  bar: { 
    backgroundColor: colors.primaryDark, 
    height: 7, 
    width: 17 },

  name: { 
    color: colors.text, 
    fontSize: 19, 
    fontWeight: '900', 
    letterSpacing: 0.4 
  },

  tagline: {
     color: colors.mutedText, 
     fontSize: 9, 
     fontWeight: '700', 
     letterSpacing: 1.05, 
     marginTop: 4 
    },
});
