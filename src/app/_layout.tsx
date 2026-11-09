import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';

export default function TabLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack id="root-stack" screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
