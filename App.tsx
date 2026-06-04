import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
} from 'react-native';
import { loadAllModels } from './src/models/ModelLoader';
import HomeScreen from './src/screens/HomeScreen';
import CameraScreen from './src/screens/CameraScreen';
import LivenessScreen from './src/screens/LivenessScreen';
import { DatabaseService } from './src/services/DatabaseService';
import { SyncService } from './src/services/SyncService';
import AttendanceLogScreen from './src/screens/AttendanceLogScreen';
import EnrollScreen from './src/screens/EnrollScreen';
import AuthenticateScreen from './src/screens/AuthenticateScreen';

type Screen = 'home' | 'liveness_enroll' | 'liveness_auth' | 'enroll' | 'authenticate' | 'logs';

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

  if (!modelsLoaded && !error) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1D9E75" />
        <Text style={styles.loadingText}>Loading ML models...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  // Liveness check before enrollment
  if (screen === 'liveness_enroll') {
    return (
      <LivenessScreen
        onPassed={() => setScreen('enroll')}
        onFailed={() => setScreen('home')}
      />
    );
  }

  // Liveness check before authentication
  if (screen === 'liveness_auth') {
    return (
      <LivenessScreen
        onPassed={() => setScreen('authenticate')}
        onFailed={() => setScreen('home')}
      />
    );
  }

  if (screen === 'enroll') {
    return (
      <EnrollScreen
        onSuccess={(name) => {
          setLastResult('Enrolled: ' + name);
          setScreen('home');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'authenticate') {
    return (
      <AuthenticateScreen
        onSuccess={(message) => {
          setLastResult(message);
          setScreen('home');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }
  if (screen === 'logs') {
    return <AttendanceLogScreen onBack={() => setScreen('home')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {lastResult && (
        <View style={styles.resultBanner}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}
      <HomeScreen
        onEnroll={() => setScreen('liveness_enroll')}
        onAuthenticate={() => setScreen('liveness_auth')}
        onViewLogs={() => setScreen('logs')}
        pendingCount={0}
        enrolledCount={0}
        todayCount={0}
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