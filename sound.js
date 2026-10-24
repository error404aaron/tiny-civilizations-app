/* Optional sound and haptics, synthesised with Web Audio (no audio files, so it also works offline). Off by default.
   Browsers only start audio from a tap, so the context is created or resumed on the first gesture after enabling. */
(function(root){
'use strict';
const AC=root.AudioContext||root.webkitAudioContext;let ctx=null,master=null,ambient=null,on=false;
function ensure(){if(ctx||!AC)return ctx;ctx=new AC();master=ctx.createGain();master.gain.value=.55;master.connect(ctx.destination);return ctx}
function tone(freq,dur,{type='sine',gain=.12,when=0,glide=0}={}){const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(master);o.start(t);o.stop(t+dur+.05)}
function noise(dur,{gain=.1,freq=1200,q=.8,when=0}={}){const t=ctx.currentTime+when,len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+dur*.25);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(master);s.start(t);s.stop(t+dur+.05)}
const SOUNDS={
inspect(){tone(880,.09,{type:'triangle',gain:.045})},
rain(){noise(1.3,{gain:.14,freq:3200,q:.6});for(let i=0;i<6;i++)tone(1400+i*170,.06,{when:.1+i*.13,gain:.02})},
forest(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.6,{type:'triangle',when:i*.08,gain:.06}))},
meteor(){tone(900,.45,{type:'sawtooth',gain:.03,glide:120});noise(.9,{gain:.24,freq:220,q:.9,when:.38});tone(70,1,{gain:.2,when:.38,glide:38})},
refuse(){tone(196,.14,{type:'square',gain:.025})},
event(){tone(659.25,.4,{gain:.035});tone(987.77,.5,{gain:.02,when:.07})},
chapter(){[392,493.88,587.33,783.99].forEach((f,i)=>tone(f,1.6,{type:'triangle',when:i*.18,gain:.06}))}};
const BUZZ={rain:12,forest:12,meteor:[40,30,60],refuse:8};
// A quiet two-note pad with a slow swell; it sits under everything else.
function startAmbient(){if(ambient||!ctx)return;const g=ctx.createGain(),f=ctx.createBiquadFilter(),lfo=ctx.createOscillator(),depth=ctx.createGain();g.gain.value=.022;f.type='lowpass';f.frequency.value=520;lfo.frequency.value=.07;depth.gain.value=.012;lfo.connect(depth).connect(g.gain);const notes=[110,164.81,220.5].map(fr=>{const o=ctx.createOscillator();o.frequency.value=fr;o.connect(f);o.start();return o});f.connect(g).connect(master);lfo.start();ambient={g,stop(){for(const o of[...notes,lfo])o.stop();g.disconnect()}}}
function stopAmbient(){if(ambient){ambient.stop();ambient=null}}
function wake(){if(!on||!ensure())return;if(ctx.state!=='running')ctx.resume().catch(()=>{});startAmbient()}
root.TinySound={
supported:!!AC,
get on(){return on},
set(value){on=!!value&&!!AC;if(on)wake();else{stopAmbient();if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{})}},
// Call from any tap: browsers keep audio suspended until a gesture.
unlock(){if(on&&(!ctx||ctx.state!=='running'))wake()},
play(name){if(on&&navigator.vibrate&&BUZZ[name])try{navigator.vibrate(BUZZ[name])}catch(e){}if(!on||!ctx||ctx.state!=='running'||!SOUNDS[name])return;try{SOUNDS[name]()}catch(e){}},
pauseForHidden(hidden){if(!ctx||!on)return;if(hidden)ctx.suspend().catch(()=>{});else wake()}};
})(typeof window!=='undefined'?window:globalThis);
