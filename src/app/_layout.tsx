import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" options={{ headerShown: true, title: 'Home' }} />
      <Stack.Screen name="explore" options={{ headerShown: true, title: 'Explore' }} />
    </Stack>
  );
}
