from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np
import os
import uuid
import random

app = FastAPI()

# Configure CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for saving uploads and results
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def generate_mel_spectrogram(audio_path, image_path):
    """
    Generates a Mel-Spectrogram from an audio file and saves it as an image.
    """
    try:
        # Load audio file
        y, sr = librosa.load(audio_path)
        
        # Generate Mel-Spectrogram
        S = librosa.feature.melspectrogram(y=y, sr=sr)
        S_dB = librosa.power_to_db(S, ref=np.max)
        
        # Plot and save
        plt.figure(figsize=(10, 4))
        librosa.display.specshow(S_dB, sr=sr, x_axis='time', y_axis='mel')
        plt.colorbar(format='%+2.0f dB')
        plt.title('Mel-frequency spectrogram')
        plt.tight_layout()
        plt.savefig(image_path)
        plt.close() # Close plot to free memory
        return True
    except Exception as e:
        print(f"Error generating spectrogram: {e}")
        return False

def analyze_image_with_llm(image_path: str) -> str:
    """
    Placeholder for LLM integration.
    You will add your API key and logic here later.
    """
    # TODO: Send image to LLM (e.g., GPT-4o, Gemini Pro Vision)
    print(f"Analyzing image at: {image_path}")
    return random.choice(["Healthy", "Infected"])

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    try:
        # 1. Save the uploaded audio file
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else "wav"
        filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
            
        print(f"Audio saved to: {file_path}")

        # 2. Generate Mel-Spectrogram
        image_filename = f"{uuid.uuid4()}.png"
        image_path = os.path.join(UPLOAD_DIR, image_filename)
        
        success = generate_mel_spectrogram(file_path, image_path)
        
        if not success:
             raise HTTPException(status_code=500, detail="Failed to generate spectrogram")

        print(f"Spectrogram saved to: {image_path}")

        # 3. Analyze with LLM (Placeholder)
        prediction = analyze_image_with_llm(image_path)
        
        return {
            "status": "success",
            "prediction": prediction,
            "spectrogram_path": image_path
        }

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
