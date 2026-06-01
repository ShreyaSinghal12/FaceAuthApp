import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { FaceDetector } from '../models/FaceDetector';
import { FaceRecognizer } from '../models/FaceRecognizer';
import { preprocessFrame } from '../utils/ImagePreprocessor';

interface Props {
  mode: 'enroll' | 'authenticate';
  userId?: string;
  onSuccess: (userId: string) => void;
  onCancel: () => void;
}

export default function CameraScreen({
  mode,
  userId,
  onSuccess,
  onCancel,
}: Props) {
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const [status, setStatus] = useState('Initializing camera...');
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);

  // Request camera permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    } else {
      setStatus(
        mode === 'enroll'
          ? 'Look at the camera to enroll'
          : 'Look at the camera to authenticate'
      );
    }
  }, [hasPermission]);

  // Frame processor — runs on every camera frame
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    // Prevent processing multiple frames at once
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // Get raw pixel data from frame
      const width = frame.width;
      const height = frame.height;

      // Preprocess frame for model input
      const imageData = new Uint8Array(frame.toArrayBuffer());
      const processedData = preprocessFrame(imageData, width, height);

      // Run face detection
      FaceDetector.detect(processedData).then((bbox) => {
        if (!bbox) {
          setStatus('No face detected — move closer');
          processingRef.current = false;
          return;
        }

        setStatus('Face detected! Hold still...');

        // Run face recognition
        FaceRecognizer.getEmbedding(processedData).then((embedding) => {
          if (!embedding) {
            processingRef.current = false;
            return;
          }

          if (mode === 'enroll' && userId) {
            // Store embedding for this user
            handleEnrollment(userId, embedding);
          } else if (mode === 'authenticate') {
            // Match against stored embeddings
            handleAuthentication(embedding);
          }

          processingRef.current = false;
        });
      });
    } catch (error) {
      processingRef.current = false;
    }
  }, []);

  const handleEnrollment = async (uid: string, embedding: number[]) => {
    try {
      // Will save to SQLite in next step
      console.log(`Enrolling user: ${uid} with embedding length: ${embedding.length}`);
      setStatus('✅ Enrolled successfully!');
      setTimeout(() => onSuccess(uid), 1000);
    } catch (error) {
      setStatus('Enrollment failed, try again');
    }
  };

  const handleAuthentication = async (embedding: number[]) => {
    try {
      // Will match against SQLite embeddings in next step
      console.log('Authenticating with embedding length:', embedding.length);
      setStatus('Processing...');
    } catch (error) {
      setStatus('Authentication failed, try again');
    }
  };

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>No front camera found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera preview */}
      <Camera
        style={styles.camera}
        device={device}
        isActive={true}
        frameProcessor={frameProcessor}
        pixelFormat="rgb"
      />

      {/* Face oval overlay */}
      <View style={styles.overlay}>
        <View style={styles.faceOval} />
      </View>

      {/* Status text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{status}</Text>
      </View>

      {/* Cancel button */}
      <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: 220,
    height: 280,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#1D9E75',
    backgroundColor: 'transparent',
  },
  statusContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1D9E75',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});