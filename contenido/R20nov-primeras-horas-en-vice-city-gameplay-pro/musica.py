"""Pista propia y sin derechos para el Reel: synthwave sencillo a 96 BPM (La m · Fa · Do · Sol).
Genera musica.wav en la carpeta actual. Uso: python3 musica.py [segundos]"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 96
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 30.0
beat = 60 / BPM
n = int(SR * DUR)
t = np.arange(n) / SR
mix = np.zeros(n)


def nota(f):
    return 440.0 * 2 ** ((f - 69) / 12)


def env(longitud, ataque=0.01, caida=0.3):
    e = np.ones(longitud)
    a = max(1, int(ataque * SR)); e[:a] = np.linspace(0, 1, a)
    c = max(1, int(caida * SR)); e[-c:] *= np.linspace(1, 0, c)
    return e


acordes = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
bajos = [33, 29, 36, 31]
compas = 4 * beat
for k in range(int(DUR / compas) + 1):
    ini = int(k * compas * SR); fin = min(n, int((k + 1) * compas * SR))
    if ini >= n:
        break
    tt = t[ini:fin] - t[ini]
    ac = acordes[k % 4]
    pad = sum(np.sin(2 * np.pi * nota(m) * tt) + 0.5 * np.sin(2 * np.pi * nota(m) * 1.003 * tt) for m in ac)
    mix[ini:fin] += 0.09 * pad * env(fin - ini, 0.4, 0.4)
    for b8 in range(8):  # bajo en corcheas
        bi = ini + int(b8 * beat / 2 * SR); bf = min(fin, bi + int(beat / 2 * SR * 0.9))
        if bi >= fin:
            break
        tb = t[bi:bf] - t[bi]
        onda = np.sign(np.sin(2 * np.pi * nota(bajos[k % 4] + (12 if b8 % 2 else 0)) * tb))
        mix[bi:bf] += 0.06 * onda * env(bf - bi, 0.005, 0.05)
# Bombo, caja y charles
for i in range(int(DUR / beat) + 1):
    p = int(i * beat * SR)
    if p >= n:
        break
    L = min(int(0.25 * SR), n - p); tk = np.arange(L) / SR
    mix[p:p + L] += 0.5 * np.sin(2 * np.pi * (110 * np.exp(-tk * 18) + 40) * tk) * np.exp(-tk * 9)
    if i % 2 == 1:
        Ls = min(int(0.18 * SR), n - p)
        mix[p:p + Ls] += 0.18 * np.random.default_rng(i).standard_normal(Ls) * np.exp(-np.arange(Ls) / SR * 22)
    for h in (0.5,):
        ph = p + int(h * beat * SR); Lh = min(int(0.04 * SR), n - ph) if ph < n else 0
        if Lh > 0:
            mix[ph:ph + Lh] += 0.05 * np.random.default_rng(1000 + i).standard_normal(Lh) * np.exp(-np.arange(Lh) / SR * 80)
mix *= env(n, 1.0, 2.0)
mix = np.tanh(mix * 1.2) / np.tanh(1.2) * 0.8
with wave.open("musica.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print("musica.wav", DUR, "s")
