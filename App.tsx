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
import EnrollScreen from './src/screens/EnrollScreen';
import AuthenticateScreen from './src/screens/AuthenticateScreen';
import AttendanceDashboard from './src/screens/AttendanceDashboard';
import SplashScreen from './src/screens/SplashScreen';

type Screen =
  | 'splash' | 'home'
  | 'liveness_enroll' | 'liveness_auth'
  | 'enroll' | 'authenticate' | 'dashboard';

export default function App() {
  const [modelsReady, setModelsReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('splash');

  const [attendanceMode, setAttendanceMode] = useState<'checkin' | 'checkout'>('checkin');
  const [dashboardUser, setDashboardUser] = useState<string>('');
  const [dashboardResult, setDashboardResult] = useState<'checkin' | 'checkout' | 'already_in' | 'not_in' | null>(null);

  const [pendingCount, setPendingCount] = useState(0);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  const refreshCounts = useCallback(async () => {
    try {
      setEnrolledCount(await DatabaseService.getEnrolledCount());
      setPendingCount(await DatabaseService.getPendingCount());
      setTodayCount(await DatabaseService.getTodayCount());
    } catch (e) {
      console.log('Count fetch error:', e);
    }
  }, []);

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
        setModelsReady(true);
      }
    };
    init();
  }, []);

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
        onSuccess={() => setScreen('home')}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'authenticate') {
    return (
      <AuthenticateScreen
        mode={attendanceMode}
        onMatched={(userId, result) => {
          setDashboardUser(userId);
          setDashboardResult(result);
          setScreen('dashboard');
        }}
        onCancel={() => setScreen('home')}
      />
    );
  }

  if (screen === 'dashboard') {
    return (
      <AttendanceDashboard
        userId={dashboardUser}
        mode={attendanceMode}
        justMarked={dashboardResult}
        onDone={() => setScreen('home')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <HomeScreen
        onEnroll={() => setScreen('liveness_enroll')}
        onAttendance={(mode) => {
          setAttendanceMode(mode);
          setScreen('liveness_auth');
        }}
        onViewLogs={() => { }}
        pendingCount={pendingCount}
        enrolledCount={enrolledCount}
        todayCount={todayCount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1A19' },
  loading: {
    flex: 1,
    backgroundColor: '#1C1A19',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: { color: '#FF6B6B', fontSize: 14, textAlign: 'center', padding: 20 },
});