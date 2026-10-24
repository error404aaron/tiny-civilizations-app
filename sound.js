/* Optional music and sound effects, each with its own switch, synthesised with Web Audio (no audio files, so both work
   offline). Off by default. Browsers only start audio from a tap, so the context is created or resumed on a gesture. */
(function(root){
'use strict';
const AC=root.AudioContext||root.webkitAudioContext,OAC=root.OfflineAudioContext||root.webkitOfflineAudioContext;
let ctx=null,master=null,fxBus=null,musicBus=null,fx=false,music=false,mood=0,player=null,sleepTimer=0;
const mtof=n=>440*Math.pow(2,(n-69)/12);
// Effects bus straight to the speakers; music bus through a soft echo so the melody has some space around it.
function buses(c,out){const fxG=c.createGain(),musicG=c.createGain(),delay=c.createDelay(2),feedback=c.createGain(),tone=c.createBiquadFilter(),wet=c.createGain();fxG.gain.value=.9;musicG.gain.value=0;delay.delayTime.value=.55;feedback.gain.value=.3;tone.type='lowpass';tone.frequency.value=2400;wet.gain.value=.24;fxG.connect(out);musicG.connect(out);musicG.connect(delay);delay.connect(tone).connect(feedback).connect(delay);tone.connect(wet).connect(out);return{fxG,musicG}}
function ensure(){if(ctx||!AC)return ctx;ctx=new AC();master=ctx.createGain();master.gain.value=.6;master.connect(ctx.destination);({fxG:fxBus,musicG:musicBus}=buses(ctx,master));return ctx}

// ---- Sound effects ----
function tone(freq,dur,{type='sine',gain=.12,when=0,glide=0}={}){const t=ctx.currentTime+when,o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(glide)o.frequency.exponentialRampToValueAtTime(glide,t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(fxBus);o.start(t);o.stop(t+dur+.05)}
function noise(dur,{gain=.1,freq=1200,q=.8,when=0}={}){const t=ctx.currentTime+when,len=Math.ceil(ctx.sampleRate*dur),buf=ctx.createBuffer(1,len,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(gain,t+dur*.25);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f).connect(g).connect(fxBus);s.start(t);s.stop(t+dur+.05)}
const SOUNDS={
inspect(){tone(880,.09,{type:'triangle',gain:.045})},
rain(){noise(1.3,{gain:.14,freq:3200,q:.6});for(let i=0;i<6;i++)tone(1400+i*170,.06,{when:.1+i*.13,gain:.02})},
forest(){[523.25,659.25,783.99,1046.5].forEach((f,i)=>tone(f,.6,{type:'triangle',when:i*.08,gain:.06}))},
meteor(){tone(900,.45,{type:'sawtooth',gain:.03,glide:120});noise(.9,{gain:.24,freq:220,q:.9,when:.38});tone(70,1,{gain:.2,when:.38,glide:38})},
refuse(){tone(196,.14,{type:'square',gain:.025})},
event(){tone(659.25,.4,{gain:.035});tone(987.77,.5,{gain:.02,when:.07})},
chapter(){[392,493.88,587.33,783.99].forEach((f,i)=>tone(f,1.6,{type:'triangle',when:i*.18,gain:.06}))}};
const BUZZ={rain:12,forest:12,meteor:[40,30,60],refuse:8};

// ---- Music: a generative piece. Each season has its own key, tempo and four-bar chord progression; a soft pad holds
// each chord for one bar, a bass line marks beats one and three, and a plucked melody wanders the scale with rests,
// landing on chord tones on the downbeat and breathing every eighth bar. ----
const MOODS=[
{bpm:80,density:.5,chords:[[62,66,69],[59,62,66],[55,59,62],[57,61,64]],scale:[62,64,66,69,71,74,76,78,81]},
{bpm:84,density:.56,chords:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]],scale:[60,62,64,67,69,72,74,76,79]},
{bpm:74,density:.44,chords:[[64,67,71],[60,64,67],[55,59,62],[62,66,69]],scale:[64,67,69,71,74,76,79,81,83]},
{bpm:66,density:.34,chords:[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],scale:[57,60,62,64,67,69,72,74,76]}];
function env(c,g,t,peak,attack,hold,release){g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+attack);g.gain.setValueAtTime(peak,t+attack+hold);g.gain.exponentialRampToValueAtTime(.0001,t+attack+hold+release)}
function voice(c,dest,t,freq,type,peak,attack,hold,release,detune=0){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;o.detune.value=detune;env(c,g,t,peak,attack,hold,release);o.connect(g).connect(dest);o.start(t);o.stop(t+attack+hold+release+.05)}
function pad(c,dest,t,notes,len){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=950;f.connect(dest);for(const n of notes){voice(c,f,t,mtof(n),'triangle',.016,.45,len-.6,1.1,-5);voice(c,f,t,mtof(n),'sine',.012,.6,len-.8,1.2,6)}}
function bass(c,dest,t,n,len){voice(c,dest,t,mtof(n-24),'sine',.075,.02,len*.3,len*.6);voice(c,dest,t,mtof(n-12),'triangle',.012,.02,.05,len*.5)}
function pluck(c,dest,t,n,peak){voice(c,dest,t,mtof(n),'triangle',peak,.006,.02,1.1);voice(c,dest,t,mtof(n+12),'sine',peak*.28,.004,.01,.35)}
function bell(c,dest,t,n){voice(c,dest,t,mtof(n),'sine',.02,.01,.02,2.2);voice(c,dest,t,mtof(n)*2.76,'sine',.006,.005,.01,.9)}
function composer(rand,log){return{step:0,mood:0,next:0,idx:4,
schedule(c,dest,t){const m=MOODS[this.mood],eighth=30/m.bpm,beat=this.step%8,bar=Math.floor(this.step/8),chord=m.chords[bar%4];
if(beat===0){pad(c,dest,t,chord,eighth*8);if(log)log.push({t,part:'chord',notes:chord});bass(c,dest,t,chord[0],eighth*4);if(bar%4===0&&rand()<.6)bell(c,dest,t+eighth*.5,chord[2]+12)}
if(beat===4)bass(c,dest,t,rand()<.5?chord[0]:chord[2]-12,eighth*3);
const rest=bar%8===7,chance=m.density*(beat%2===0?1.35:.55);
if(!rest&&rand()<chance){this.idx=Math.max(0,Math.min(m.scale.length-1,this.idx+[-2,-1,-1,0,1,1,2][Math.floor(rand()*7)]));if(beat===0){const tones=m.scale.map((n,k)=>chord.some(x=>((x-n)%12+12)%12===0)?k:-1).filter(k=>k>=0);this.idx=tones.reduce((a,k)=>Math.abs(k-this.idx)<Math.abs(a-this.idx)?k:a,tones[0])}pluck(c,dest,t,m.scale[this.idx],beat===0?.06:.045);if(log)log.push({t,part:'melody',note:m.scale[this.idx]})}
this.step++;if(this.step%8===0&&this.pending!==undefined){this.mood=this.pending;this.pending=undefined}return eighth}}}
function startMusic(){if(player||!ctx)return;const p=composer(Math.random);p.mood=mood;p.next=ctx.currentTime+.1;musicBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,ctx.currentTime);musicBus.gain.linearRampToValueAtTime(1,ctx.currentTime+2.5);
// Schedule a little ahead on a timer; after a suspension the clock has not moved, so nothing piles up.
p.timer=setInterval(()=>{if(ctx.state!=='running')return;if(p.next<ctx.currentTime-.2)p.next=ctx.currentTime+.05;while(p.next<ctx.currentTime+.3)p.next+=p.schedule(ctx,musicBus,p.next)},60);player=p}
function stopMusic(){if(!player)return;const p=player;player=null;musicBus.gain.cancelScheduledValues(ctx.currentTime);musicBus.gain.setValueAtTime(musicBus.gain.value,ctx.currentTime);musicBus.gain.linearRampToValueAtTime(0,ctx.currentTime+.8);setTimeout(()=>clearInterval(p.timer),900)}
function wake(){if(!(fx||music)||!ensure())return;clearTimeout(sleepTimer);if(ctx.state!=='running')ctx.resume().catch(()=>{});if(music)startMusic()}
// With both switched off, release the audio hardware once the music has faded.
function sleepIfSilent(){if(fx||music||!ctx)return;clearTimeout(sleepTimer);sleepTimer=setTimeout(()=>{if(!fx&&!music&&ctx.state==='running')ctx.suspend().catch(()=>{})},1000)}
root.TinySound={
supported:!!AC,
get fx(){return fx},get music(){return music},
setFx(value){fx=!!value&&!!AC;if(fx)wake();else sleepIfSilent()},
setMusic(value){music=!!value&&!!AC;if(music)wake();else{stopMusic();sleepIfSilent()}},
// 0 spring … 3 winter; the music changes key and pace at the next bar.
setMood(season){mood=season;if(player&&player.mood!==season)player.pending=season},
// Call from any tap: browsers keep audio suspended until a gesture.
unlock(){if((fx||music)&&(!ctx||ctx.state!=='running'))wake()},
play(name){if(!fx)return;if(navigator.vibrate&&BUZZ[name])try{navigator.vibrate(BUZZ[name])}catch(e){}if(!ctx||ctx.state!=='running'||!SOUNDS[name])return;try{SOUNDS[name]()}catch(e){}},
pauseForHidden(hidden){if(!ctx||!(fx||music))return;if(hidden)ctx.suspend().catch(()=>{});else wake()},
// For tests: render `seconds` of the music for a season without touching the speakers; resolves to the samples and the notes played.
renderMusic(seconds,season=0,seed=1){if(!OAC)return Promise.reject(new Error('No OfflineAudioContext'));const rate=22050,c=new OAC(1,Math.ceil(rate*seconds),rate),{musicG}=buses(c,c.destination);musicG.gain.value=1;let s=seed>>>0||1;const rand=()=>{s=Math.imul(s^s>>>15,s|1)+0x6D2B79F5>>>0;return s/4294967296};const notes=[],p=composer(rand,notes);p.mood=season;for(let t=.05;t<seconds;)t+=p.schedule(c,musicG,t);return c.startRendering().then(b=>({samples:b.getChannelData(0),notes}))}};
})(typeof window!=='undefined'?window:globalThis);
