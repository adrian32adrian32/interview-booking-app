import wave
import struct
import math

# Parametri sunet
sample_rate = 44100
duration = 0.2  # 200ms
frequency = 880  # Hz (A5 note)

# Generează sunet
num_samples = int(sample_rate * duration)
samples = []

for i in range(num_samples):
    t = float(i) / sample_rate
    value = int(32767 * math.sin(2 * math.pi * frequency * t))
    samples.append(struct.pack('<h', value))

# Salvează ca WAV
with wave.open('notification.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    wav_file.writeframes(b''.join(samples))

print("Notification sound created!")
