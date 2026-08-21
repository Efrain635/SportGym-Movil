import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { auth, onAuthStateChanged } from '../../FirebaseConfig';

export default function IndexScreen() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Usuario autenticado, redirigir a tabs
        router.replace('/(tabs)');
      } else {
        // Usuario no autenticado, redirigir a login
        router.replace('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#090A0A' }} />;
}
