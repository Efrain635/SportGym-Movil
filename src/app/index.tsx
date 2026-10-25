import { router } from 'expo-router';
import { useEffect, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    View
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

const { width, height } = Dimensions.get("window");

export default function IndexScreen() {
  const [fadeAnim] = useState(() => new Animated.Value(1));
  const { user, isRestoringSession } = useAuth();

  useEffect(() => {
    if (isRestoringSession) return;

    // Animación de salida después de 3 segundos
    const fadeOutAnimation = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    });

    const timer = setTimeout(() => {
      fadeOutAnimation.start(() => {
        router.replace(user ? '/(tabs)' : '/login');
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      fadeOutAnimation.stop();
    };
  }, [fadeAnim, isRestoringSession, user]);

  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim }
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={require('@/Imagen/Imagen-d-bienvenida-nv.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  backgroundImage: {
    width: width,
    height: height,
  },
});
