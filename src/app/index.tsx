import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { auth, onAuthStateChanged } from '../../FirebaseConfig';
import { WelcomeScreen } from '../components/welcome-screen';

export default function IndexScreen() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleWelcomeComplete = () => {
    setShowWelcome(false);
    // Redirigir inmediatamente después de la animación de bienvenida
    if (user) {
      // Usuario autenticado, redirigir a tabs
      router.replace('/(tabs)');
    } else {
      // Usuario no autenticado, redirigir a login
      router.replace('/login');
    }
  };

  if (showWelcome) {
    return <WelcomeScreen onComplete={handleWelcomeComplete} />;
  }

  return <View style={{ flex: 1, backgroundColor: '#090A0A' }} />;
}
