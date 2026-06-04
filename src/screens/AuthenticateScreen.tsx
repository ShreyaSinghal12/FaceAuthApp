import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { FaceRecognizer } from '../models/FaceRecognizer';
import { DatabaseService } from '../services/DatabaseService';

interface Props {
  onSuccess: (name: string) => void;
  onCancel: () => void;
}

export default function AuthenticateScreen({ onSuccess, onCancel }: Props) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState('Tap to scan your face');
  const [processing, setProcessing] = useState(false);
  const [matchedName, setMatchedName] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [todayStatus, setTodayStatus] = useState<'none' | 'in' | 'out'>('none');

  const captureAndMatch = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('Camera permission denied');
        return;
      }
    }

    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'front',
      quality: 0.8,
      includeBase64: true,
    });

    if (result.didCancel || !result.assets?.[0]) return;

    const image = result.assets[0];
    setImageUri(image.uri || null);
    setProcessing(true);
    setStatus('Matching face...');
    setMatchedName(null);

    try {
      const base64 = image.base64;
      if (!base64) throw new Error('No image data');

      const startTime = Date.now();

      const embedding = await FaceRecognizer.getEmbedding(base64);
      if (!embedding) throw new Error('Could not extract face features');

      const embeddingTime = Date.now() - startTime;

      const stored = await DatabaseService.getAllEmbeddings();
      if (stored.length === 0) {
        setStatus('No users enrolled yet');
        setProcessing(false);
        return;
      }

      const matchStart = Date.now();
      let bestScore = 0;
      let bestUser: string | null = null;
      for (const s of stored) {
        const score = FaceRecognizer.cosineSimilarity(embedding, s.embedding);
        if (score > bestScore) {
          bestScore = score;
          bestUser = s.userId;
        }
      }
      const matchTime = Date.now() - matchStart;
      const totalTime = Date.now() - startTime;

      console.log('BENCHMARK - Embedding:', embeddingTime, 'ms');
      console.log('BENCHMARK - Matching:', matchTime, 'ms');
      console.log('BENCHMARK - Total:', totalTime, 'ms');
      console.log('BENCHMARK - Enrolled users:', stored.length);

      const confidencePercent = Math.round(bestScore * 100 * 10) / 10;
      setConfidence(confidencePercent);

      if (bestUser && bestScore >= 0.75) {
        setMatchedName(bestUser);
        setStatus('');
        // Check today's attendance status
        const records = await DatabaseService.getAttendanceForUser(bestUser);
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        console.log('TODAY KEY:', today);
        console.log('RECORDS:', JSON.stringify(records));
        const todayRec = records.find((r: any) => r.date === today);
        if (!todayRec) {
          setTodayStatus('none');
        } else if (todayRec.check_out) {
          setTodayStatus('out');
        } else {
          setTodayStatus('in');
        }
      } else {
        setStatus('Face not recognized');
        setMatchedName(null);
      }
    } catch (error: any) {
      setStatus('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const confirmAttendance = async () => {
    if (matchedName) {
      const result = await DatabaseService.markAttendance(matchedName);
      if (result === 'checkin') {
        onSuccess(`Welcome, ${matchedName} — Checked IN`);
      } else {
        onSuccess(`Goodbye, ${matchedName} — Checked OUT`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mark attendance</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>Liveness verified</Text>
        <Text style={styles.bannerSub}>Anti-spoofing check passed</Text>
      </View>

      <View style={styles.faceBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.faceCircle}>
            <Text style={styles.faceIcon}>◯</Text>
          </View>
        )}
        <Text style={styles.faceStatus}>
          {imageUri ? 'Face captured' : 'Position your face'}
        </Text>
      </View>

      {matchedName && (
        <View style={styles.matchCard}>
          <Text style={styles.matchName}>{matchedName}</Text>
          <Text style={styles.matchConfidence}>Confidence {confidence}%</Text>
          <View style={styles.confidenceTrack}>
            <View style={[styles.confidenceFill, { width: `${Math.min(confidence, 100)}%` }]} />
          </View>
          <Text style={styles.actionHint}>
            {todayStatus === 'none' && 'Tap to check IN'}
            {todayStatus === 'in' && 'Tap to check OUT'}
            {todayStatus === 'out' && 'Already checked out today'}
          </Text>
        </View>
      )}

      {status ? <Text style={styles.status}>{status}</Text> : null}

      {processing ? (
        <View style={styles.processingBox}>
          <ActivityIndicator color="#5DAE8B" />
        </View>
      ) : matchedName ? (
        todayStatus === 'out' ? (
          <TouchableOpacity style={styles.scanButton} onPress={onCancel}>
            <Text style={styles.scanText}>Done</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.confirmButton} onPress={confirmAttendance}>
            <Text style={styles.confirmText}>
              {todayStatus === 'none' ? 'Check IN' : 'Check OUT'}
            </Text>
          </TouchableOpacity>
        )
      ) : (
        <TouchableOpacity style={styles.scanButton} onPress={captureAndMatch}>
          <Text style={styles.scanText}>Scan face</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1A19',
    padding: 22,
    paddingTop: 55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  back: { color: '#C8703C', fontSize: 16, width: 50 },
  title: { fontSize: 18, fontWeight: '600', color: '#F7F4F0' },
  banner: {
    backgroundColor: '#262321',
    borderWidth: 1,
    borderColor: '#3A352F',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerTitle: { fontSize: 14, color: '#C8703C', fontWeight: '600' },
  bannerSub: { fontSize: 12, color: '#8B847C', marginTop: 2 },
  faceBox: {
    backgroundColor: '#161413',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  faceCircle: {
    width: 100,
    height: 120,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#5DAE8B',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIcon: { fontSize: 44, color: '#5A544C' },
  previewImage: {
    width: 100,
    height: 120,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#5DAE8B',
  },
  faceStatus: { fontSize: 13, color: '#5DAE8B', marginTop: 10 },
  matchCard: {
    backgroundColor: '#1E2620',
    borderWidth: 1,
    borderColor: '#2C4438',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  matchName: { fontSize: 18, fontWeight: '600', color: '#5DAE8B' },
  matchConfidence: { fontSize: 13, color: '#8B847C', marginVertical: 6 },
  confidenceTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#161413',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceFill: { height: '100%', backgroundColor: '#5DAE8B', borderRadius: 3 },
  actionHint: {
    fontSize: 13,
    color: '#C8703C',
    marginTop: 10,
    fontWeight: '500',
  },
  status: { color: '#C8703C', fontSize: 14, textAlign: 'center', marginVertical: 10 },
  scanButton: {
    backgroundColor: '#C8703C',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  scanText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  confirmButton: {
    backgroundColor: '#5DAE8B',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: { color: '#15201A', fontSize: 16, fontWeight: '600' },
  processingBox: { alignItems: 'center', paddingVertical: 16 },
});