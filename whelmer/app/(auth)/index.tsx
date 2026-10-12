import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/Colors';

export default function AuthScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Authentication Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  text: { fontSize: 18, color: Colors.textDark, fontWeight: '600' },
});