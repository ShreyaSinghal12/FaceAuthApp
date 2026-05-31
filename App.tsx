import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>FaceAuth</Text>
        <Text style={styles.subtitle}>Offline Facial Recognition System</Text>
        <Text style={styles.status}>✓ Environment ready</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    letterSpacing: 0.5,
  },
  status: {
    fontSize: 13,
    color: '#1D9E75',
    marginTop: 8,
  },
});