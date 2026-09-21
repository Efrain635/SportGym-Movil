import { router } from 'expo-router';
import { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    View
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function IndexScreen() {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animación de salida después de 3 segundos
    const fadeOutAnimation = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    });

    const timer = setTimeout(() => {
      fadeOutAnimation.start(() => {
        router.replace('/login');
      });
    }, 3000);

    return () => {
      clearTimeout(timer);
      fadeOutAnimation.stop();
    };
  }, []);

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
