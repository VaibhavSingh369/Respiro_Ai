# 🫁 Respiro_Ai

> 🚀 **Project Status: MVP / Demo Ready** > This project is a fully functional prototype demonstrating end-to-end integration of Mobile, Cloud, and AI technologies.

---

## 📌 Overview

**Respiro_AI** is an AI-powered telemedicine application designed to democratize early respiratory diagnosis. By leveraging **Audio Signal Processing** and **Computer Vision AI**, the app analyzes cough sounds to detect potential respiratory anomalies (e.g., Pneumonia, Bronchitis) instantly using a smartphone.

The system converts raw audio into **Mel-Spectrograms** (visual representations of sound) and uses a **Google Vertex AI** model to perform clinical-grade screening, providing results in seconds without expensive medical equipment.

⚠️ **Important:** Respiro_AI is a **screening and decision-support tool**, designed to assist—not replace—professional medical diagnosis.

---

## 🎯 Problem Statement

Respiratory diseases are often diagnosed late in rural and underserved areas due to:
- 🏥 **Lack of Infrastructure:** Limited access to X-ray machines and CT scanners.
- 👨‍⚕️ **Shortage of Specialists:** Few pulmonologists in remote regions.
- ⏳ **Time Delays:** Traditional referrals take days or weeks.

Respiro_AI provides an **accessible, non-invasive, and instant preliminary screening tool** using nothing but a phone microphone.

---

## 💡 Solution Approach: The "Sound-to-Vision" Pipeline

Our system treats audio classification as an image recognition problem:

1.  **Capture:** High-fidelity audio recording via the React Native mobile app.
2.  **Transformation:** The Python backend uses **Librosa** to convert audio waves into **Mel-Spectrogram images**.
3.  **Vision Analysis:** These spectrograms are sent to **Google Vertex AI**, which detects visual patterns associated with respiratory distress.
4.  **Persistence:** Data is synced in real-time to **Firebase**, creating a permanent medical record for the patient.

---

## 🧠 Key Features

### 📱 **Patient-Centric Mobile App**
- **One-Tap Analysis:** Simple "Record & Analyze" workflow.
- **Visual Diagnostics:** Displays the actual **Spectrogram** fingerprint of the user's cough.
- **Real-Time Feedback:** Instant "Healthy" vs "Anomaly" classification with confidence scores.
- **Medical-Grade UI:** Clean, gradient-based aesthetics designed for accessibility.

### ☁️ **Cloud & Data Management**
- **Patient History:** A slide-out side menu lists all past patients.
- **Interactive Dashboard:**
    - **Tap** to reload full diagnostic reports.
    - **Long-Press** to delete erroneous records.
- **Cloud Sync:** All data (Audio, Images, Metadata) is stored in **Firebase**, ensuring records are never lost even if the app is uninstalled.

---

## 🏗️ System Architecture & Tech Stack

The project follows a modern **Client-Server-Cloud** architecture.

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Mobile Frontend** | **React Native (Expo)** | Cross-platform UI (iOS/Android), Audio Recording, File Management. |
| **Backend API** | **FastAPI (Python)** | High-performance server, API routing, Request handling. |
| **DSP Engine** | **Librosa** | Digital Signal Processing (Converting `.wav` audio to `.png` spectrograms). |
| **AI Model** | **Google Vertex AI** | AutoML Vision model hosted on a cloud endpoint for classification. |
| **Database** | **Firebase Firestore** | Real-time NoSQL database for storing patient metadata and history. |
| **File Storage** | **Firebase Storage** | Object storage for hosting raw audio files and spectrogram images. |
| **Tunneling** | **Ngrok** | Secure tunneling to expose the local backend for global access/demos. |



---

## ⚙️ How It Works (Under the Hood)

1.  **User** records a cough and enters Patient Details (Name/Age).
2.  **App** sends the audio file to the **FastAPI Server**.
3.  **Server** processes the audio:
    * Generates a unique ID (UUID).
    * Creates a strict 4x4 inch Mel-Spectrogram using **Librosa**.
4.  **Server** sends the spectrogram image to **Google Cloud Vertex AI**.
5.  **AI** returns a prediction (Label + Confidence Score).
6.  **Server** uploads the original audio and spectrogram image to **Firebase Storage**.
7.  **Server** saves the full report to **Firestore Database**.
8.  **App** receives the result and updates the UI instantly.

