import numpy as np, wave
from scipy.signal import butter, sosfilt
sr=44100; D=30.0; n=int(sr*D); t=np.arange(n)/sr; rng=np.random.default_rng(4)
def lp(x,f): return sosfilt(butter(3,f,btype='low',fs=sr,output='sos'),x)
def bp(x,a,b): return sosfilt(butter(3,[a,b],btype='band',fs=sr,output='sos'),x)
def env(a,b,fi=.5,fo=.5): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)*((t>=a)&(t<=b))
out=np.zeros(n)
# --- music: warm pad, 4 chords x 7.5 s (Am F C G), slow evolving
chords=[[220,261.6,329.6],[174.6,220,261.6],[261.6,329.6,392],[196,246.9,293.7]]
pad=np.zeros(n)
for i in range(4):
    a=i*7.5; e=env(a,a+7.5+1.0,1.8,2.2)
    for f in chords[i]:
        for det in (0.996,1.0,1.004):
            pad+=np.sin(2*np.pi*f*det*t+rng.uniform(0,6))*e*0.018
    pad+=np.sin(2*np.pi*chords[i][0]/2*t)*e*0.05
pad+=0.5*lp(pad,1800)
# simple arpeggio pluck from 14 s
arp=np.zeros(n)
notes=[440,523.3,659.3,523.3,349.2,440,523.3,440,523.3,659.3,784,659.3,392,493.9,587.3,493.9]
for k in range(int((D-14)/0.5)):
    ts=14+k*0.5; f=notes[k%16]; d=np.clip(t-ts,0,None)*(t>=ts)
    arp+=np.sin(2*np.pi*f*t)*np.exp(-d*5)*(t>=ts)*0.035
out+=pad+arp
# --- foley: excavator rumble, hammering, crane hum, scaffold clinks, final chime
out+=lp(rng.standard_normal(n),180)*env(2.3,5.6)*0.5*(0.7+0.3*np.sin(t*9))
for ts in np.arange(8.6,23.5,0.55):
    d=np.clip(t-ts,0,None)*(t>=ts); out+=bp(rng.standard_normal(n),300,2200)*np.exp(-d*38)*(t>=ts)*0.10*rng.uniform(.6,1.1)
for ts in np.arange(12.0,22.0,0.9):
    d=np.clip(t-ts,0,None)*(t>=ts); f=rng.uniform(1800,3200); out+=np.sin(2*np.pi*f*t)*np.exp(-d*30)*(t>=ts)*0.025
out+=np.sin(2*np.pi*95*t)*env(3,24.5,1,1.5)*0.012
for ts in [19.6,20.4,21.2]:
    d=np.clip(t-ts,0,None)*(t>=ts); out+=lp(rng.standard_normal(n),900)*np.exp(-d*14)*(t>=ts)*0.05
for ts in [28.0]:
    d=np.clip(t-ts,0,None)*(t>=ts)
    for f in (523.3,659.3,784,1046.5): out+=np.sin(2*np.pi*f*t)*np.exp(-d*1.4)*(t>=ts)*0.05
out*=np.clip(t/1.2,0,1)*np.clip((D-t)/1.8,0,1)
out=out/np.abs(out).max()*0.85
with wave.open('audio.wav','wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((out*32767).astype(np.int16).tobytes())
print('audio ok')
