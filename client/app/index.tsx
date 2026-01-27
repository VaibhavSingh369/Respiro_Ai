import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, SafeAreaView, StatusBar, TextInput, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  // --- STATE ---
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'stopped'>('idle');
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [permissionResponse, requestPermission] = Audio.usePermissions();

  // Data
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');

  // Results
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [spectrogramUrl, setSpectrogramUrl] = useState<string | null>(null);

  // UI State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showAnalysisCard, setShowAnalysisCard] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Side Menu State
  const [historyList, setHistoryList] = useState<any[]>([]); // History Data

  // --- CONFIGURATION ---
  const SERVER_IP = '10.157.102.5:8000'; // ⚠️ CHECK YOUR IP!
  const API_URL = `http://${SERVER_IP}/analyze`;
  const HISTORY_URL = `http://${SERVER_IP}/history`;
  const BASE_URL = `http://${SERVER_IP}`;

  // --- FUNCTIONS ---

  // 1. Fetch History
  const fetchHistory = async () => {
    try {
      const response = await fetch(HISTORY_URL);
      const result = await response.json();
      if (result.status === 'success') {
        setHistoryList(result.data);
      }
    } catch (e) {
      console.log("History Fetch Error", e);
    }
  };

  // 2. Load History Item (NEW FEATURE: Tap to View)
  const loadItem = (item: any) => {
    setPatientName(item.name);
    setPatientAge(item.age ? String(item.age) : ''); // Handle missing age safely
    setPrediction(item.diagnosis);
    setConfidence(item.confidence);
    setSpectrogramUrl(item.spectrogram_url);

    // Switch to Analysis View
    setShowAnalysisCard(true);
    setIsMenuOpen(false);
    setRecordingStatus('stopped');
  };

  // 3. Delete History Item (NEW FEATURE: Long Press to Delete)
  const deleteItem = (patientName: string, reportId: string) => {
    Alert.alert(
      "Delete Record",
      `Are you sure you want to delete ${patientName}'s report?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Encode URI components to handle spaces in names
              const url = `${HISTORY_URL}/${encodeURIComponent(patientName)}/${reportId}`;
              await fetch(url, { method: 'DELETE' });
              fetchHistory(); // Refresh list immediately
            } catch (err) {
              Alert.alert("Error", "Could not delete record.");
            }
          }
        }
      ]
    );
  };

  const toggleMenu = () => {
    if (!isMenuOpen) {
      fetchHistory(); // Refresh data when opening
    }
    setIsMenuOpen(!isMenuOpen);
  };

  async function startRecording() {
    try {
      if (permissionResponse?.status !== 'granted') {
        const r = await requestPermission();
        if (r.status !== 'granted') return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setRecordingStatus('recording');
      setShowAnalysisCard(true);

      setPrediction(null);
      setSpectrogramUrl(null);
      setRecordedUri(null);
    } catch (err) {
      Alert.alert("Error", "Failed to start recording.");
    }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecordingStatus('stopped');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecordedUri(uri);
    setRecording(null);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (!result.canceled) {
        setRecordedUri(result.assets[0].uri);
        setRecordingStatus('stopped');
        setShowAnalysisCard(true);
        setIsFabOpen(false);
        setPrediction(null);
        setSpectrogramUrl(null);
      }
    } catch (err) { console.error(err); }
  };

  const uploadRecording = async () => {
    if (!recordedUri) return;
    if (!patientName || !patientAge) { Alert.alert("Missing Info", "Enter Name & Age"); return; }

    setLoading(true);
    setPrediction(null);
    setSpectrogramUrl(null);

    try {
      const formData = new FormData();
      const fileType = recordedUri.split('.').pop();
      const fileName = `recording.${fileType}`;
      formData.append('file', { uri: recordedUri, name: fileName, type: `audio/${fileType}` } as any);
      formData.append('patient_name', patientName);
      formData.append('patient_age', patientAge);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setPrediction(data.prediction);
        setConfidence(data.confidence);
        setSpectrogramUrl(data.spectrogram_url.startsWith('http') ? data.spectrogram_url : `${BASE_URL}${data.spectrogram_url}`);
      } else {
        Alert.alert("Error", data.message || "Server Error");
      }
    } catch (error) {
      Alert.alert("Connection Error", "Check server IP.");
    } finally {
      setLoading(false);
    }
  };

  const resetApp = () => {
    if (showAnalysisCard) {
      setShowAnalysisCard(false); // If in analysis mode, go back home
    } else {
      toggleMenu(); // If home, open menu
    }
    setRecordedUri(null);
    setPrediction(null);
    setPatientName('');
    setPatientAge('');
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient colors={['#E0F7FA', '#FFFFFF', '#E8EAF6']} style={styles.background} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>

          {/* --- HEADER --- */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.menuButton} onPress={resetApp}>
              {showAnalysisCard ? (
                <Ionicons name="arrow-back" size={28} color="#4A90E2" />
              ) : (
                <Ionicons name="menu" size={32} color="#4A90E2" />
              )}
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Respiro_Ai</Text>
              <Text style={styles.subtitle}>Cough Sound Analyzer</Text>
            </View>
            <View style={{ width: 32 }} />
          </View>

          {/* --- MAIN SCROLL --- */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {!showAnalysisCard ? (
              <View style={styles.homeContent}>
                <Image source={require('../assets/cough-illustration.png')} style={styles.illustration} resizeMode="contain" />
                <TouchableOpacity style={styles.mainButton} onPress={startRecording}>
                  <Text style={styles.mainButtonText}>Record Cough</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>New Analysis</Text>
                {recordingStatus === 'recording' ? (
                  <View style={styles.recordingContainer}>
                    <ActivityIndicator size="large" color="#E74C3C" />
                    <Text style={styles.recordingText}>Listening...</Text>
                    <TouchableOpacity style={[styles.actionButton, styles.stopButton]} onPress={stopRecording}>
                      <Text style={styles.buttonText}>Stop Recording</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.formContainer}>
                    <Text style={styles.label}>Patient Details</Text>
                    <TextInput style={styles.input} placeholder="Name" value={patientName} onChangeText={setPatientName} />
                    <TextInput style={styles.input} placeholder="Age" value={patientAge} onChangeText={setPatientAge} keyboardType="numeric" />
                    <TouchableOpacity style={[styles.actionButton, styles.analyzeButton]} onPress={uploadRecording} disabled={loading}>
                      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Analyze with AI</Text>}
                    </TouchableOpacity>
                  </View>
                )}
                {prediction && (
                  <View style={styles.resultBox}>
                    <Text style={styles.resultLabel}>Diagnosis:</Text>
                    <Text style={[styles.resultValue, prediction.includes('Healthy') ? styles.green : styles.red]}>
                      {prediction.includes('Healthy') ? "Healthy" : "Anomaly"}
                    </Text>
                    <Text style={styles.confidence}>Confidence: {confidence}%</Text>
                    {spectrogramUrl && <Image source={{ uri: spectrogramUrl }} style={styles.spectrogram} resizeMode="contain" />}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* --- FAB --- */}
          {!showAnalysisCard && !isMenuOpen && (
            <View style={styles.fabContainer}>
              {isFabOpen && (
                <>
                  <TouchableOpacity style={styles.fab} onPress={() => Alert.alert("Coming Soon", "Use main Record button for now!")}>
                    <View style={styles.fabLabelContainer}><Text style={styles.fabLabel}>Create Patient</Text></View>
                    <View style={styles.fabIconContainer}><FontAwesome5 name="user-plus" size={20} color="white" /></View>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.fab} onPress={pickAudio}>
                    <View style={styles.fabLabelContainer}><Text style={styles.fabLabel}>Upload Cough</Text></View>
                    <View style={styles.fabIconContainer}><MaterialCommunityIcons name="upload" size={24} color="white" /></View>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[styles.mainFab, isFabOpen ? styles.fabOpen : null]} onPress={() => setIsFabOpen(!isFabOpen)}>
                <Ionicons name="add" size={36} color="white" style={isFabOpen ? { transform: [{ rotate: '45deg' }] } : null} />
              </TouchableOpacity>
            </View>
          )}

          {/* --- SIDE MENU (HISTORY) --- */}
          <Modal visible={isMenuOpen} transparent={true} animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.sideMenu}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuTitle}>Patient History</Text>
                  <TouchableOpacity onPress={toggleMenu}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
                </View>
                <FlatList
                  data={historyList}
                  keyExtractor={(item) => item.id} // Ensure 'id' is used as key
                  ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.historyItem}
                      onPress={() => loadItem(item)}            // <--- TAP to Load
                      onLongPress={() => deleteItem(item.name, item.id)} // <--- LONG PRESS to Delete
                    >
                      <View>
                        <Text style={styles.historyName}>{item.name}</Text>
                        <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                      </View>
                      <View style={styles.historyBadge}>
                        <Text style={[styles.historyStatus, item.diagnosis.includes('Healthy') ? styles.greenText : styles.redText]}>
                          {item.diagnosis.includes('Healthy') ? "Healthy" : "Sick"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <TouchableOpacity style={styles.touchableArea} onPress={toggleMenu} />
            </View>
          </Modal>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  background: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, marginTop: 40 },
  titleContainer: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4A90E2' },
  subtitle: { fontSize: 16, color: '#7F99A6' },
  menuButton: { padding: 5 },
  homeContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50, paddingBottom: 100 },
  illustration: { width: 300, height: 300, marginBottom: 40 },
  mainButton: { backgroundColor: '#4A90E2', paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30, elevation: 8 },
  mainButtonText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  card: { backgroundColor: 'white', margin: 20, borderRadius: 20, padding: 20, elevation: 5 },
  cardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  formContainer: { width: '100%' },
  label: { fontSize: 16, color: '#666', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#f5f7fa', borderRadius: 10, padding: 15, marginBottom: 15, fontSize: 16, borderWidth: 1, borderColor: '#e1e1e1' },
  recordingContainer: { alignItems: 'center', padding: 20 },
  recordingText: { marginTop: 10, fontSize: 18, color: '#E74C3C', fontWeight: 'bold' },
  actionButton: { paddingVertical: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  analyzeButton: { backgroundColor: '#50c878' },
  stopButton: { backgroundColor: '#E74C3C', width: '100%' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  resultBox: { marginTop: 30, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
  resultLabel: { fontSize: 18, color: '#888' },
  resultValue: { fontSize: 32, fontWeight: 'bold', marginVertical: 5 },
  green: { color: '#27ae60' },
  red: { color: '#c0392b' },
  confidence: { fontSize: 16, color: '#999', marginBottom: 15 },
  spectrogram: { width: 250, height: 250, borderRadius: 10, backgroundColor: '#000' },
  fabContainer: { position: 'absolute', bottom: 40, right: 30, alignItems: 'flex-end' },
  fab: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  fabLabelContainer: { backgroundColor: 'white', padding: 8, borderRadius: 8, elevation: 2, marginRight: 10 },
  fabLabel: { color: '#4A90E2', fontWeight: 'bold' },
  fabIconContainer: { backgroundColor: '#4A90E2', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  mainFab: { backgroundColor: '#4A90E2', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  fabOpen: { backgroundColor: '#E74C3C' },

  // --- SIDE MENU STYLES ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row' },
  sideMenu: { width: '80%', backgroundColor: 'white', height: '100%', padding: 20, paddingTop: 60 },
  touchableArea: { width: '20%', height: '100%' },
  menuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  menuTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  emptyText: { color: '#999', textAlign: 'center', marginTop: 20 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  historyName: { fontSize: 18, fontWeight: '600', color: '#333' },
  historyDate: { fontSize: 14, color: '#999' },
  historyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#f5f7fa' },
  historyStatus: { fontWeight: 'bold' },
  greenText: { color: '#27ae60' },
  redText: { color: '#c0392b' },
});