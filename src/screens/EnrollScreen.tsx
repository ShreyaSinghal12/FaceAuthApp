import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  ScrollView,
} from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { FaceRecognizer } from '../models/FaceRecognizer';
import { DatabaseService } from '../services/DatabaseService';

interface Props {
  onSuccess: (name: string) => void;
  onCancel: () => void;
}

export default function EnrollScreen({ onSuccess, onCancel }: Props) {
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success' | 'info'>('info');
  const [processing, setProcessing] = useState(false);

  const captureAndEnroll = async () => {
    if (!name.trim()) {
      setStatus('Please enter a worker name');
      setStatusType('error');
      return;
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('Camera permission denied');
        setStatusType('error');
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
    setStatus('Processing face...');
    setStatusType('info');

    try {
      const base64 = image.base64;
      if (!base64) throw new Error('No image data');

      // Step 1: Extract face embedding
      const embedding = await FaceRecognizer.getEmbedding(base64);
      if (!embedding) throw new Error('Could not extract face features');

      // ── Step 2: DUPLICATE CHECK ──────────────────────────────────────────
      // Compare new face against all enrolled faces before saving
      setStatus('Checking for duplicates...');
      const duplicateName = await DatabaseService.findDuplicateFace(embedding);
      if (duplicateName) {
        // Same face already enrolled under a different name — reject!
        setStatus(`Already enrolled as "${duplicateName}". Cannot enroll again.`);
        setStatusType('error');
        setProcessing(false);
        return;
      }
      // ─────────────────────────────────────────────────────────────────────

      // Step 3: No duplicate — safe to enroll
      const userId = empId.trim()
        ? `${name.trim()} (${empId.trim()})`
        : name.trim();

      await DatabaseService.enrollUser(userId, embedding);

      setStatus('Enrolled successfully!');
      setStatusType('success');
      setTimeout(() => onSuccess(name.trim()), 1000);

    } catch (error: any) {
      setStatus('Error: ' + error.message);
      setStatusType('error');
    } finally {
      setProcessing(false);
    }
  };

  const statusColor =
    statusType === 'error' ? '#FF6B6B' :
    statusType === 'success' ? '#1D9E75' :
    '#C8703C';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Enroll worker</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Face capture preview */}
        <View style={styles.captureBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <View style={styles.faceCircle}>
              <Text style={styles.faceIcon}>🙂</Text>
            </View>
          )}
          <Text style={styles.captureHint}>
            {imageUri ? 'Face captured' : 'Position face in frame'}
          </Text>
        </View>

        {/* Worker name field */}
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Worker name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor="#5A544C"
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Employee ID field */}
        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Employee ID (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. EMP-001"
            placeholderTextColor="#5A544C"
            value={empId}
            onChangeText={setEmpId}
            autoCapitalize="characters"
          />
        </View>

        {/* Status message */}
        {status ? (
          <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        ) : null}

        {/* Capture button */}
        {processing ? (
          <View style={styles.processingBox}>
            <ActivityIndicator color="#C8703C" />
            <Text style={styles.processingText}>{status}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={captureAndEnroll}>
            <Text style={styles.buttonText}>📸  Capture & enroll</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#080808' },
  scroll: { padding: 22, paddingTop: 55 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  back: { color: '#C8703C', fontSize: 16, width: 50 },
  title: { fontSize: 18, fontWeight: '600', color: '#F7F4F0' },
  captureBox: {
    backgroundColor: '#050505',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3A352F',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    marginBottom: 18,
  },
  faceCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#C8703C',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceIcon: { fontSize: 50 },
  previewImage: {
    width: 110,
    height: 140,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: '#C8703C',
  },
  captureHint: { fontSize: 13, color: '#8B847C', marginTop: 12 },
  inputBox: {
    backgroundColor: '#0F0F0F',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  inputLabel: { fontSize: 11, color: '#6B645C', marginBottom: 4 },
  input: { fontSize: 16, color: '#F7F4F0', padding: 0 },
  status: { fontSize: 14, textAlign: 'center', marginVertical: 10 },
  button: {
    backgroundColor: '#C8703C',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
  },
  processingText: { color: '#8B847C', fontSize: 14 },
});
