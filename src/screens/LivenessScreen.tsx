import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  NativeModules,
} from 'react-native';

interface Props {
  onPassed: () => void;
  onFailed: () => void;
}

const CHALLENGES = ['blink', 'smile', 'turn'];

export default function LivenessScreen({ onPassed, onFailed }: Props) {
  const [status, setStatus] = useState('Starting liveness check...');

  useEffect(() => {
    runLiveness();
  }, []);

  const runLiveness = async () => {
    const challenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];

    try {
      const { FaceRecognition } = NativeModules;
      if (!FaceRecognition || !FaceRecognition.startLiveness) {
        setStatus('Liveness module not available');
        setTimeout(onFailed, 1500);
        return;
      }

      const passed = await FaceRecognition.startLiveness(challenge);

      if (passed) {
        setStatus('Liveness verified!');
        setTimeout(onPassed, 500);
      } else {
        setStatus('Liveness check failed');
        setTimeout(onFailed, 1500);
      }
    } catch (error: any) {
      console.log('Liveness error:', error);
      setStatus('Error: ' + error.message);
      setTimeout(onFailed, 1500);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1D9E75" />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  status: {
    color: '#aaa',
    fontSize: 16,
  },
});