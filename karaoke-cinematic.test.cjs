// Needs: npm i jsdom   ·   run: node tests/karaoke-dom.smoke.cjs
// Loads the real player in jsdom and checks smooth fill, per-song offset, tap editor and keyboard flow.
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(String(e.message||e).slice(0,200)));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/',virtualConsole:vc,
 beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};
  w.matchMedia=w.matchMedia||(()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}));
  w.AudioContext=undefined;w.HTMLCanvasElement.prototype.getContext=()=>null;
  w.IntersectionObserver=class{observe(){}disconnect(){}};w.ResizeObserver=class{observe(){}disconnect(){}};
  w.scrollTo=()=>{};w.Element.prototype.scrollTo=function(){};w.confirm=()=>true;}});
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1};
setTimeout(()=>{
 const w=dom.window,d=w.document;
 const K=w.__karaokeTest;const E=c=>w.eval('with(__karaokeTest){'+c+'}');
 E(`window.__t=0;const a=document.getElementById('au');let _t=0;Object.defineProperty(a,'currentTime',{get(){return window.__t},set(v){window.__t=v},configurable:true});Object.defineProperty(a,'duration',{get(){return 60},configurable:true});Object.defineProperty(a,'paused',{get(){return false},configurable:true});
  T.set('t1',{id:'t1',title:'Test Song',artist:'Tester',dur:60});S.cur='t1';`);
 // 1) word-synced lyrics render + smooth fill
 E(`overlay.classList.add('open');installLyrics(parseManualLyrics('[00:02.00]<00:02.00>Привет <00:03.00>мир<00:04.00>\\n[00:06.00]<00:06.00>Вторая <00:07.00>строка<00:08.00>',60),T.get('t1'));`);
 ok(E('lrc.length')===2,'lyrics installed (2 lines)');
 w.__t=2.5;E('syncLyrics(true)');
 const chars=[...d.querySelectorAll('#karaokeLines .kl[data-i="0"] .kc')];
 const ps=chars.slice(0,6).map(c=>c.style.getPropertyValue('--p'));
 console.log('  --p of "Привет" letters @2.5s:',ps.join(' '));
 ok(ps.some(v=>v&&+v>0&&+v<1)||ps.every(v=>v==='1'||v==='0'),'letters have fractional/binary fill values');
 ok(+chars[0].style.getPropertyValue('--p')===1,'first letter fully filled at 2.5s');
 ok(+chars[5].style.getPropertyValue('--p')===0,'last letter of word 1 still empty at 2.5s');
 ok(d.querySelector('#karaokeLines .kl[data-i="1"]').classList.contains('next'),'next line pre-highlighted');
 w.__t=7;E('syncLyrics(true)');
 ok(d.querySelector('#karaokeLines .kl[data-i="0"]').classList.contains('past'),'previous line is past');
 ok([...d.querySelectorAll('#karaokeLines .kl[data-i="0"] .kc')].every(c=>c.style.getPropertyValue('--p')==='1'),'past line fully filled (also after seek)');
 // 2) per-song offset
 E(`setKaraokeOffset(300)`);ok(E('offset')===300&&w.localStorage.getItem('karaoke-offset:t1')==='300','offset stored per song');
 E(`T.set('t2',{id:'t2',title:'Other',artist:'X',dur:60});S.cur='t2';installLyrics(parseManualLyrics('[00:01.00]one two',60),T.get('t2'))`);
 ok(E('offset')===0||E('offset')===0,'other song does not inherit the offset');
 E(`S.cur='t1';installLyrics(parseManualLyrics('[00:02.00]a b',60),T.get('t1'))`);ok(E('offset')===300,'offset restored for the first song');
 // 3) tap flow (words mode)
 E(`document.getElementById('karaokeInput').value='Hello big world\\nSecond line here';`);
 E(`tap.mode='words';openTap()`);
 ok(E('tap.open')&&d.getElementById('karaokeTap').classList.contains('open'),'tap panel opens');
 ok(d.querySelectorAll('#tapCur .tw').length===3,'current line shows 3 word chips');
 [1,1.5,2,5,5.4,5.9].forEach(t=>{w.__t=t+.12;E('tapHit()')});
 ok(E('tap.i')===6,'6 taps recorded');
 ok(d.getElementById('tapBtn').disabled,'tap button disables when finished');
 w.__t=5.4+.12;E('tapUndo()');ok(E('tap.i')===5,'undo steps back one');
 w.__t=5.9+.12;E('tapHit()');
 E('saveTap()');
 ok(!E('tap.open'),'tap panel closed after save');
 ok(E('lrc.length')===2&&E('lrc[0].wordSynced')===true,'saved timing is word-synced');
 ok(Math.abs(E('lrc[0].words[1].t')-1.5)<.011,'second word starts at tapped 1.50s (reaction compensated)');
 const cached=JSON.parse(w.localStorage.getItem(E('lyricsCacheKey(T.get("t1"))')));ok(cached&&cached.source==='manual','timing cached for the song');
 ok(E('offset')===0,'offset reset to 0 after tap-sync');
 // 4) keyboard: Space taps, Esc closes tap not karaoke
 E(`tap.mode='lines';document.getElementById('karaokeInput').value='L1\\nL2';openTap()`);
 w.__t=3;d.dispatchEvent&&w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Space',bubbles:true,cancelable:true}));
 ok(E('tap.i')===1,'Space key records a tap');
 w.dispatchEvent(new w.KeyboardEvent('keydown',{code:'Escape',bubbles:true,cancelable:true}));
 ok(!E('tap.open')&&d.getElementById('karaokeOverlay').classList.contains('open'),'Esc closes tap editor only');
 const real=errs.filter(e=>!/IDBFactory/.test(e));ok(real.length===0,'no runtime errors ('+real.slice(0,3).join(' | ')+')');
 process.exit(process.exitCode||0)},2500);
