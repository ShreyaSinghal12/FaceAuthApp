import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator, View, Text } from 'react-native';
import { loadAllModels } from './src/models/ModelLoader';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import { DatabaseService } from './src/services/DatabaseService';
import { SyncService } from './src/services/SyncService';

type Screen = 'home' | 'enroll' | 'authenticate';

export default function App() {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [enrollUserId, setEnrollUserId] = useState('');
  const [lastResult, setLastResult] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await DatabaseService.init();
        await loadAllModels();
        SyncService.startAutoSync();
        setModelsLoaded(true);
      } catch (err: any) {
        setError(err.message);
      }
    };
    init();
  }, []);

  // Loading screen
  if (!modelsLoaded && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Loading ML models...</Text>
      </View>
    );
  }

  // Error screen
  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>❌ {error}</Text>
      </View>
    );
  }

  // Camera screens
  if (screen === 'enroll') {
    return (
      <CameraScreen
        mode="enroll"
        userId={enrollUserId}
        onSuccess={(uid) => {
          setLastResult(`✅ ${uid} enrolled`);
          setScreen('home');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'authenticate') {
    return (
      <CameraScreen
        mode="authenticate"
        onSuccess={(uid) => {
          setLastResult(`✅ Welcome, ${uid}!`);
          setScreen('home');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }

  // Home screen
  return (
    <SafeAreaView style={styles.container}>
      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}
      <HomeScreen
        onEnroll={(uid) => {
          setEnrollUserId(uid);
          setScreen('enroll');
        }}
        onAuthenticate={() => setScreen('authenticate')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loading: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: { color: '#888', fontSize: 14 },
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', padding: 20 },
  resultBanner: {
    backgroundColor: '#0F3D2E',
    padding: 12,
    alignItems: 'center',
  },
  resultText: { color: '#1D9E75', fontSize: 14, fontWeight: '500' },
});