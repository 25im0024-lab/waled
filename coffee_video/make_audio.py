import numpy as np, wave
from scipy.signal import butter, sosfilt
sr=44100; D=11.0; n=int(sr*D); t=np.arange(n)/sr; rng=np.random.default_rng(1)
def bp(x,lo,hi): return sosfilt(butter(4,[lo,hi],btype='band',fs=sr,output='sos'),x)
def win(a,b,fi=0.15,fo=0.3): return np.clip((t-a)/fi,0,1)*np.clip((b-t)/fo,0,1)*((t>=a)&(t<=b))
out=np.zeros(n)
out+=bp(rng.standard_normal(n),700,3800)*win(2.35,4.9)*0.35*(0.8+0.2*np.sin(t*37))   # pour
out+=bp(rng.standard_normal(n),200,900)*win(2.35,4.9)*0.25
w=win(5.1,7.0,0.8,0.8); out+=bp(rng.standard_normal(n),300,2500)*w*0.12             # morph whoosh
out+=(np.sin(2*np.pi*(80+40*np.sin(np.pi*np.clip((t-5.1)/1.9,0,1)))*t))*w*0.08
for ta in [6.35,6.45,6.5,6.55,6.6,6.65,6.7,6.75,6.8,6.85,6.9]:                        # ice clinks
    d=np.clip(t-(ta+0.45),0,None)*((t>=ta+0.45)); f=rng.uniform(2200,5200)
    out+=np.sin(2*np.pi*f*t)*np.exp(-d*28)*(t>=ta+0.45)*0.18+np.sin(2*np.pi*f*1.52*t)*np.exp(-d*40)*(t>=ta+0.45)*0.10
out+=bp(rng.standard_normal(n),3000,9000)*win(7.4,10.6,1.0,1.0)*0.015                 # soft fizz
out+=np.sin(2*np.pi*55*t)*win(0.5,10.5,1.5,1.5)*0.03                                  # room tone
fade=np.clip(t/0.6,0,1)*np.clip((D-t)/0.8,0,1); out*=fade
out=out/np.abs(out).max()*0.8
with wave.open('audio.wav','wb') as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(sr); f.writeframes((out*32767).astype(np.int16).tobytes())
