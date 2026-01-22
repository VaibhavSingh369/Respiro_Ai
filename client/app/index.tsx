import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);

  // REPLACE THIS WITH YOUR LOCAL IP ADDRESS
  const API_URL = 'http://10.157.102.5:8000/analyze';

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        console.log('Requesting permission..');
        const r = await requestPermission();
        if (r.status !== 'granted') {
          Alert.alert("Permission Required", "Microphone permission is needed to record.");
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setRecordingStatus('recording');
      setResult(null);
      setRecordedUri(null);
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert("Error", "Failed to start recording.");
    }
  }

  async function stopRecording() {
    console.log('Stopping recording..');
    if (!recording) return;

    setRecordingStatus('stopped');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUri(uri);
    setRecording(null);
    console.log('Recording stopped and stored at', uri);

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  }

  const uploadRecording = async () => {
    if (!recordedUri) {
      Alert.alert("No Recording", "Please record something first.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();

      const fileType = recordedUri.split('.').pop();
      const fileName = `recording.${fileType}`;

      const fileToUpload = {
        uri: recordedUri,
        name: fileName,
        type: `audio/${fileType}`,
      } as any;

      formData.append('file', fileToUpload);

      console.log(`Uploading to ${API_URL}...`);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      console.log("Server response:", data);

      if (response.ok) {
        setResult(data.prediction);
      } else {
        Alert.alert("Error", "Server returned an error.");
      }

    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Could not connect to server with " + API_URL + ".");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Respiro_Ai</Text>
      <Text style={styles.subtitle}>Cough Sound Analyzer</Text>

      <View style={styles.card}>
        {recordingStatus === 'recording' ? (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopRecording}>
            <Text style={styles.buttonText}>Stop Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={startRecording}>
            <Text style={styles.buttonText}>{recordedUri ? 'Record Again' : 'Start Recording'}</Text>
          </TouchableOpacity>
        )}

        {recordedUri && (
          <Text style={styles.fileName}>Recording saved!</Text>
        )}

        <TouchableOpacity
          style={[styles.button, styles.uploadButton, (!recordedUri || recordingStatus === 'recording') && styles.disabledButton]}
          onPress={uploadRecording}
          disabled={!recordedUri || loading || recordingStatus === 'recording'}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Analyze Cough</Text>
          )}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Diagnosis:</Text>
          <Text style={[styles.resultText, result === 'Healthy' ? styles.healthy : styles.infected]}>
            {result}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#4a90e2',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
  },
  uploadButton: {
    backgroundColor: '#50c878',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  fileName: {
    marginVertical: 10,
    color: '#333',
    fontStyle: 'italic',
  },
  resultContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 20,
    color: '#333',
  },
  resultText: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 10,
  },
  healthy: {
    color: '#50c878',
  },
  infected: {
    color: '#e74c3c',
  },
});
