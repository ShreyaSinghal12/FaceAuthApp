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

interface Props {
  mode: 'enroll' | 'authenticate';
  userId?: string;
  onSuccess: (userId: string) => void;
  onCancel: () => void;
}

export default function CameraScreen({ mode, userId, onSuccess, onCancel }: Props) {
  const [status, setStatus] = useState(
    mode === 'enroll' ? 'Tap to capture your face' : 'Tap to authenticate'
  );
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const captureAndProcess = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'FaceAuth needs camera access to capture your face',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('❌ Camera permission denied — go to Settings and allow camera');
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

    try {
      const base64 = image.base64;
      if (!base64) throw new Error('No image data');

      if (mode === 'enroll' && userId) {
        const embedding = await FaceRecognizer.getEmbedding(base64);
        if (!embedding) throw new Error('Could not extract face features');
        console.log(`Enrolled ${userId} with ${embedding.length}-dim embedding`);
        setStatus('✅ Enrolled successfully!');
        setTimeout(() => onSuccess(userId), 1000);
      } else if (mode === 'authenticate') {
        const embedding = await FaceRecognizer.getEmbedding(base64);
        if (!embedding) throw new Error('Could not extract face features');
        console.log(`Got embedding with ${embedding.length} dims`);
        setStatus('✅ Face processed!');
        setTimeout(() => onSuccess('user'), 1000);
      }
    } catch (error: any) {
      setStatus(`❌ ${error.message} — try again`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === 'enroll' ? `Enrolling: ${userId}` : 'Authentication'}
      </Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>👤</Text>
        </View>
      )}

      <Text style={styles.status}>{status}</Text>

      {processing && (
        <ActivityIndicator color="#1D9E75" style={{ marginTop: 12 }} />
      )}

      {!processing && (
        <TouchableOpacity style={styles.captureButton} onPress={captureAndProcess}>
          <Text style={styles.captureText}>📷 Capture Face</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
  },
  preview: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#1D9E75',
  },
  placeholder: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderIcon: { fontSize: 80 },
  status: {
    color: '#aaa',
    fontSize: 15,
    marginTop: 24,
    textAlign: 'center',
  },
  captureButton: {
    backgroundColor: '#1D9E75',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginTop: 24,
  },
  captureText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
  },
  cancelText: {
    color: '#666',
    fontSize: 15,
  },
});