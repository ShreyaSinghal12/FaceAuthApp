import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';

interface Props {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: Props) {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Ring appears first
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      // Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // Loading dots appear
      Animated.timing(dotsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(800),
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={styles.container}>
      {/* Outer ring */}
      <Animated.View style={[
        styles.ring,
        { transform: [{ scale: ringScale }], opacity: ringOpacity }
      ]}>
        {/* Inner ring */}
        <View style={styles.innerRing}>
          {/* Face icon */}
          <Animated.View style={[
            styles.logoWrap,
            { transform: [{ scale: logoScale }], opacity: logoOpacity }
          ]}>
            <Text style={styles.faceIcon}>🔒</Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
        Scanix
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Offline • Secure • Fast
      </Animated.Text>

      {/* Loading indicator */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        <View style={styles.dot} />
        <View style={[styles.dot, styles.dotMid]} />
        <View style={styles.dot} />
      </Animated.View>

      <Animated.Text style={[styles.loadingText, { opacity: dotsOpacity }]}>
        Loading AI models...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080808',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  ring: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#C8703C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  innerRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: '#3A352F',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  logoWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F7F4F0',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: '#8B847C',
    letterSpacing: 2,
    marginBottom: 48,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C8703C',
    opacity: 0.4,
  },
  dotMid: {
    opacity: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: 12,
    color: '#5A544C',
    letterSpacing: 0.5,
  },
});
