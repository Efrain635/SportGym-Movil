import { StyleSheet, Text, View } from 'react-native';

export default function AppTabs() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>SportGym App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
