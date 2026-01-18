import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np

# Path to your .wav file
audio_path = "./0zexHIcM7tQDdnFiEj2Eb0v3g212/cough-heavy.wav"   # <-- change this

# Load audio file
y, sr = librosa.load(audio_path, sr=None)

# Compute Mel-Spectrogram
mel_spec = librosa.feature.melspectrogram(
    y=y,
    sr=sr,
    n_mels=128,
    fmax=sr // 2
)

# Convert to decibel (log scale)
mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)

# Plot
plt.figure(figsize=(10, 4))
librosa.display.specshow(
    mel_spec_db,
    sr=sr,
    x_axis='time',
    y_axis='mel'
)
plt.colorbar(format='%+2.0f dB')
plt.title("Mel-Spectrogram")
plt.tight_layout()
plt.show()
