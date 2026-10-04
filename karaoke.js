(()=> {
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='karaoke.css';
  document.head.appendChild(link);
(()=> {
  const $=id=>document.getElementById(id);
  const ov=$('karaokeOverlay'), linesEl=$('karaokeLines'), empty=$('karaokeEmpty');
  const title=$('karaokeTitle'), artist=$('karaokeArtist'), prog=$('karaokeProgress').firstElementChild;
  let rows=[], raf=0, current=-1, objectUrl=null;

  function currentTrack(){
    try{return window.S && window.T && window.S.cur ? window.T.get(window.S.cur) : null}catch{return null}
  }
  function parseLRC(text){
    const out=[];
    for(const raw of String(text||'').split(/\r?\n/)){
      const times=[...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
      const lyric=raw.replace(/\[(\d+):(\d+(?:\.\d+)?)\]/g,'').trim();
      if(!times.length || !lyric) continue;
      for(const m of times) out.push({t:+m[1]*60 + +m[2], text:lyric});
    }
    out.sort((a,b)=>a.t-b.t);
    return out;
  }
  function draw(){
    linesEl.innerHTML='';
    rows.forEach((r,i)=>{
      const el=document.createElement('div');
      el.className='kline';
      el.textContent=r.text;
      el.dataset.i=i;
      el.onclick=()=>{try{
        if(window.isYT && window.isYT() && window.yp?.seekTo) window.yp.seekTo(r.t,true);
        else if(window.au){window.au.currentTime=r.t; if(window.au.paused) window.au.play()}
      }catch{}};
      linesEl.appendChild(el);
    });
    empty.style.display=rows.length?'none':'block';
  }
  function open(text){
    const t=currentTrack();
    title.textContent=t?.title || 'Текст песни';
    artist.textContent=t?.artist || '';
    rows=parseLRC(text);
    current=-1; draw();
    ov.classList.add('on'); ov.setAttribute('aria-hidden','false');
    update();
  }
  function update(){
    if(!ov.classList.contains('on')) return;
    let time=0,dur=0;
    try{
      if(window.isYT && window.isYT() && window.yp?.getCurrentTime){
        time=window.yp.getCurrentTime()||0; dur=window.yp.getDuration()||0;
      }else if(window.au){
        time=window.au.currentTime||0; dur=window.au.duration||0;
      }
    }catch{}
    if(dur) prog.style.width=Math.max(0,Math.min(100,time/dur*100))+'%';
    let idx=-1;
    for(let i=0;i<rows.length;i++) if(rows[i].t<=time) idx=i;
    if(idx!==current){
      current=idx;
      [...linesEl.children].forEach((el,i)=>{
        el.classList.toggle('active',i===idx);
        el.classList.toggle('past',i<idx);
      });
      const active=linesEl.children[idx];
      if(active) active.scrollIntoView({behavior:'smooth',block:'center'});
    }
    raf=requestAnimationFrame(update);
  }
  function close(){
    ov.classList.remove('on');ov.setAttribute('aria-hidden','true');
    cancelAnimationFrame(raf);
  }
  $('karaokeClose').onclick=close;
  $('karaokeAdd').onclick=()=>{
    const input=document.createElement('input');input.type='file';input.accept='.lrc,.txt,text/plain';
    input.onchange=async()=>{
      const f=input.files?.[0];if(!f)return;
      const text=await f.text(); const t=currentTrack(); if(!t)return;
      const key='karaoke_lrc_'+(t.id||window.S?.cur||'unknown');
      localStorage.setItem(key,text); open(text);
      try{if(window.toast)window.toast('Текст сохранён для этой песни')}catch{}
    };input.click();
  };
  window.openKaraoke=()=>{
    const t=currentTrack(); if(!t)return;
    const key='karaoke_lrc_'+(t.id||window.S?.cur||'unknown');
    open(localStorage.getItem(key)||t.lrc||t.lyrics||'');
  };
  window.closeKaraoke=close;

  // Keyboard shortcut.
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ov.classList.contains('on'))close()});

  // Add a "Текст" button to the now-playing/player controls without destroying existing UI.
  function addButton(){
    if(document.getElementById('karaokeOpenBtn')) return;
    const btn=document.createElement('button');
    btn.id='karaokeOpenBtn';btn.type='button';btn.textContent='Текст';
    btn.title='Открыть караоке';
    btn.onclick=window.openKaraoke;
    const candidates=['#ctl','#pl','#pc','#player'];
    for(const s of candidates){const p=document.querySelector(s);if(p){p.appendChild(btn);return}}
    document.body.appendChild(btn);
  }
  addButton();
  setInterval(addButton,1500);
  setInterval(()=>{if(ov.classList.contains('on')) update()},250);
})();

})();
