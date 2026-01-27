from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
import os
import uuid
import base64
import datetime
from google.cloud import aiplatform
import firebase_admin
from firebase_admin import credentials, firestore, storage

# --- 1. CONFIGURATION ---
PROJECT_ID = "respiro-ai"        
ENDPOINT_ID = "5113308511786237952"     
LOCATION = "us-central1"
STORAGE_BUCKET = "respiro-ai.firebasestorage.app" 

# --- 2. AUTHENTICATION ---
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "key.json"

# Initialize Firebase (Only once)
if not firebase_admin._apps:
    cred = credentials.Certificate("key.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket': STORAGE_BUCKET
    })

db = firestore.client()
bucket = storage.bucket()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Local temp folder
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# --- HELPER FUNCTIONS ---

def upload_to_firebase(local_path, destination_path):
    """Uploads file to Firebase and returns the public link."""
    blob = bucket.blob(destination_path)
    blob.upload_from_filename(local_path)
    blob.make_public() 
    return blob.public_url

def generate_spectrogram(audio_path, image_path):
    try:
        y, sr = librosa.load(audio_path, sr=None)
        S = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        S_dB = librosa.power_to_db(S, ref=np.max)
        plt.figure(figsize=(4, 4))
        plt.axis('off')
        librosa.display.specshow(S_dB, sr=sr, x_axis='time', y_axis='mel')
        plt.savefig(image_path, bbox_inches='tight', pad_inches=0)
        plt.close()
        return True
    except Exception as e:
        print(f"Spec Error: {e}")
        return False

def get_vertex_prediction(image_path):
    try:
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        endpoint = aiplatform.Endpoint(endpoint_name=ENDPOINT_ID)
        with open(image_path, "rb") as f:
            encoded_content = base64.b64encode(f.read()).decode("utf-8")
        
        instance = {"content": encoded_content}
        print("Sending to Google AI...")
        prediction = endpoint.predict(instances=[instance])
        result = prediction.predictions[0]
        
        labels = result.get('displayNames', result.get('display_names', []))
        scores = result.get('confidences', [])
        max_score = max(scores)
        winner_label = labels[scores.index(max_score)]
        
        return {
            "label": winner_label,
            "confidence": round(max_score * 100, 2)
        }
    except Exception as e:
        print(f"Vertex AI Error: {e}")
        return None

# --- API ENDPOINTS ---

@app.post("/analyze")
async def analyze_audio(
    file: UploadFile = File(...), 
    patient_name: str = Form(...),
    patient_age: str = Form(...)
):
    try:
        # A. Save locally temporarily
        unique_id = str(uuid.uuid4())
        audio_filename = f"{unique_id}.wav"
        audio_path = os.path.join(UPLOAD_DIR, audio_filename)
        with open(audio_path, "wb") as buffer:
            buffer.write(await file.read())

        # B. Generate Spectrogram
        image_filename = f"{unique_id}.png"
        image_path = os.path.join(UPLOAD_DIR, image_filename)
        if not generate_spectrogram(audio_path, image_path):
            raise HTTPException(status_code=500, detail="Spectrogram failed")

        # C. Get AI Prediction
        ai_result = get_vertex_prediction(image_path)
        if not ai_result:
            # Fallback if model is offline
            raise HTTPException(status_code=500, detail="AI Model Offline")

        # D. Upload to Firebase Storage
        print("Uploading files to cloud...")
        audio_url = upload_to_firebase(audio_path, f"recordings/{audio_filename}")
        image_url = upload_to_firebase(image_path, f"spectrograms/{image_filename}")

        # E. Save Data to Firestore
        print("Saving to Database...")
        # Structure: patients -> [Name] -> reports -> [ID]
        doc_ref = db.collection('patients').document(patient_name).collection('reports').document(unique_id)
        
        report_data = {
            "id": unique_id,
            "patient_name": patient_name,
            "patient_age": patient_age,
            "diagnosis": ai_result['label'],
            "confidence": ai_result['confidence'],
            "audio_url": audio_url,
            "spectrogram_url": image_url,
            "timestamp": datetime.datetime.now().isoformat()
        }
        doc_ref.set(report_data)

        return {
            "status": "success",
            "prediction": ai_result['label'],
            "confidence": ai_result['confidence'],
            "spectrogram_url": image_url
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {"status": "error", "message": str(e)}

@app.get("/history")
async def get_history():
    """
    Fetches history with FULL details (ID, Spectrogram URL, Age) 
    so the app can reload the full report or delete it.
    """
    try:
        # 'collection_group' searches ALL collections named 'reports' regardless of patient
        docs = db.collection_group('reports') \
            .order_by('timestamp', direction=firestore.Query.DESCENDING) \
            .limit(20) \
            .stream()
        
        history_data = []
        for doc in docs:
            data = doc.to_dict()
            history_data.append({
                "id": data.get("id"), # Needed for Deletion
                "name": data.get("patient_name", "Unknown"),
                "age": data.get("patient_age", ""), # Needed for Reloading
                "diagnosis": data.get("diagnosis", "Unknown"),
                "date": data.get("timestamp", ""),
                "confidence": data.get("confidence", 0),
                "spectrogram_url": data.get("spectrogram_url", "") # Needed for Reloading
            })
            
        return {"status": "success", "data": history_data}

    except Exception as e:
        print(f"History Error: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/history/{patient_name}/{report_id}")
async def delete_report(patient_name: str, report_id: str):
    """
    Deletes a specific report from Firestore.
    """
    try:
        # Path: patients -> [Name] -> reports -> [ID]
        print(f"Deleting report for {patient_name} with ID {report_id}")
        doc_ref = db.collection('patients').document(patient_name).collection('reports').document(report_id)
        
        # Check if exists first (optional but good practice)
        doc = doc_ref.get()
        if not doc.exists:
             return {"status": "error", "message": "Document not found"}

        doc_ref.delete()
        return {"status": "success", "message": "Deleted"}
    except Exception as e:
        print(f"Delete Error: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)