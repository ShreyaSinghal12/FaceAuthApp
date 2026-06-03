import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { loadAllModels } from './src/models/ModelLoader';
import HomeScreen from './src/screens/HomeScreen';
import LivenessScreen from './src/screens/LivenessScreen';
import { DatabaseService } from './src/services/DatabaseService';
import { SyncService } from './src/services/SyncService';
import AttendanceLogScreen from './src/screens/AttendanceLogScreen';
import EnrollScreen from './src/screens/EnrollScreen';
import AuthenticateScreen from './src/screens/AuthenticateScreen';
import SplashScreen from './src/screens/SplashScreen';

type Screen = 'splash' | 'home' | 'liveness_enroll' | 'liveness_auth' | 'enroll' | 'authenticate' | 'logs';

export default function App() {
  const [modelsReady, setModelsReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('splash');
  const [lastResult, setLastResult] = useState<string | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    try {
      const enrolled = await DatabaseService.getEnrolledCount();
      const pending = await DatabaseService.getPendingCount();
      const today = await DatabaseService.getTodayCount();
      setEnrolledCount(enrolled);
      setPendingCount(pending);
      setTodayCount(today);
    } catch (e) {
      console.log('Count fetch error:', e);
    }
  }, []);

  // Load models in background while splash plays
  useEffect(() => {
    const init = async () => {
      try {
        await DatabaseService.init();
        await loadAllModels();
        SyncService.startAutoSync();
        await refreshCounts();
        setModelsReady(true);
      } catch (err: any) {
        setError(err.message);
        setModelsReady(true); // still finish splash even on error
      }
    };
    init();
  }, []);

  // Go to home only when BOTH splash animation done AND models loaded
  const handleSplashFinish = () => {
    setSplashDone(true);
    if (modelsReady) setScreen('home');
  };

  useEffect(() => {
    if (modelsReady && splashDone) setScreen('home');
  }, [modelsReady, splashDone]);

  useEffect(() => {
    if (screen === 'home') refreshCounts();
  }, [screen]);

  if (screen === 'splash') {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (error) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (screen === 'liveness_enroll') {
    return (
      <LivenessScreen
        onPassed={() => setScreen('enroll')}
        onFailed={() => setScreen('home')}
      />
    );
  }

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
          setLastResult(`✓ ${name} enrolled successfully`);
          setScreen('home');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'authenticate') {
    return (
      <AuthenticateScreen
        onSuccess={(msg) => {
          setLastResult(msg); // msg already contains "Checked IN" or "Checked OUT"
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
        <View style={[
          styles.resultBanner,
          lastResult.includes('OUT') ? styles.bannerOut : styles.bannerIn
        ]}>
          <Text style={styles.resultText}>{lastResult}</Text>
        </View>
      )}
      <HomeScreen
        onEnroll={() => { setLastResult(null); setScreen('liveness_enroll'); }}
        onAuthenticate={() => { setLastResult(null); setScreen('liveness_auth'); }}
        onViewLogs={() => setScreen('logs')}
        pendingCount={pendingCount}
        enrolledCount={enrolledCount}
        todayCount={todayCount}
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
  },
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', padding: 20 },
  resultBanner: {
    padding: 14,
    alignItems: 'center',
  },
  bannerIn: { backgroundColor: '#0F3D2E' },
  bannerOut: { backgroundColor: '#2A1A0E' },
  resultText: { color: '#F7F4F0', fontSize: 14, fontWeight: '500' },
});