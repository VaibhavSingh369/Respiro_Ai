# 🫁 Respiro_AI

> ⚠️ **Project Status: Under Active Development**  
> This project is currently in the development phase.  
> **New changes, features, and improvements are being added regularly.**

---

## 📌 Overview

**Respiro_AI** is an AI-powered respiratory screening system that analyzes **cough audio** to identify **abnormal respiratory patterns**.  
The system converts cough sounds into **mel-spectrogram images** and uses a **cloud-based machine learning model** to perform early-stage screening for respiratory abnormalities.

The project is designed to support **low-resource and rural healthcare settings**, where access to diagnostic tools like X-rays and specialists may be limited.

⚠️ **Important:**  
Respiro_AI is a **screening and decision-support tool**, **not a diagnostic system**.

---

## 🎯 Problem Statement

Respiratory diseases are often diagnosed late in rural and underserved areas due to:
- Lack of diagnostic infrastructure (X-ray, CT scans)
- Shortage of trained medical professionals
- Delayed referrals and subjective assessment

Respiro_AI aims to provide an **accessible, non-invasive, and fast preliminary screening tool** using only a smartphone microphone.

---

## 💡 Solution Approach

The system follows a **sound-to-vision AI pipeline**:

1. Capture cough audio via a mobile application  
2. Preprocess and clean the audio signal  
3. Convert audio into mel-spectrogram images  
4. Classify spectrograms using a cloud-hosted AI model  
5. Assess respiratory risk and provide recommendations  

The model is trained using **publicly available respiratory datasets** and focuses on distinguishing:
- **Healthy cough patterns**
- **Symptomatic / abnormal cough patterns**

---

## 🧠 Key Features

- 🎤 Smartphone-based cough recording  
- 🎵 Audio preprocessing and normalization  
- 🖼️ Mel-spectrogram generation  
- ☁️ Cloud-based AI inference (Vertex AI)  
- 📊 Risk-based output with confidence scores  
- 🩺 Ethical and explainable screening results  

---

## 🏗️ System Architecture

**Frontend**
- Mobile application (React Native)
- Audio recording and result display

**Backend**
- Audio preprocessing
- Spectrogram generation
- API integration

**AI / Cloud**
- Image-based cough classification model
- Deployed on Google Cloud Vertex AI

---

