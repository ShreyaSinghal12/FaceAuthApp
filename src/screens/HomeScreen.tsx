import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';

interface Props {
  onEnroll: (userId: string) => void;
  onAuthenticate: () => void;
}

export default function HomeScreen({ onEnroll, onAuthenticate }: Props) {
  const [userId, setUserId] = useState('');
  const [showEnrollInput, setShowEnrollInput] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>FaceAuth</Text>
      <Text style={styles.subtitle}>Offline Facial Recognition</Text>
      <Text style={styles.tagline}>Hackathon 7.0</Text>

      <View style={styles.buttonContainer}>
        {/* Authenticate button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onAuthenticate}>
          <Text style={styles.primaryButtonText}>🔓 Authenticate</Text>
        </TouchableOpacity>

        {/* Enroll button */}
        {!showEnrollInput ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowEnrollInput(true)}>
            <Text style={styles.secondaryButtonText}>+ Enroll New User</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enrollContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name or ID"
              placeholderTextColor="#666"
              value={userId}
              onChangeText={setUserId}
              autoFocus
            />
            <TouchableOpacity
              style={[
                styles.primaryButton,
                !userId && styles.disabledButton,
              ]}
              onPress={() => {
                if (userId.trim()) {
                  onEnroll(userId.trim());
                  setShowEnrollInput(false);
                  setUserId('');
                }
              }}
              disabled={!userId}>
              <Text style={styles.primaryButtonText}>Start Enrollment</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEnrollInput(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={styles.footer}>100% offline · No internet required</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 12,
    color: '#1D9E75',
    marginTop: 4,
    letterSpacing: 1,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 60,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#1D9E75',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#aaa',
    fontSize: 17,
  },
  enrollContainer: {
    gap: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#1a5c45',
    opacity: 0.5,
  },
  cancelText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    color: '#333',
    fontSize: 12,
  },
});
