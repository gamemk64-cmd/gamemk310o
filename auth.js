(()=>{
const C=AUTH_CFG,cloud=!!(C.SB_URL&&C.SB_KEY),L=localStorage;
let U=null;try{U=JSON.parse(L.getItem('mp_auth'))}catch{}
const ns=U?U.id:'guest';
/* у каждого аккаунта своя библиотека и настройки */
const gi=Storage.prototype.getItem,si=Storage.prototype.setItem,io=IDBFactory.prototype.open;
Storage.prototype.getItem=function(k){return gi.call(this,k=='mp'?'mp:'+ns:k)};
Storage.prototype.setItem=function(k,v){return si.call(this,k=='mp'?'mp:'+ns:k,v)};
IDBFactory.prototype.open=function(n,v){return io.call(this,n=='mp'?'mp:'+ns:n,v)};
const enc=new TextEncoder(),hx=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async(p,salt)=>hx(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:150000,hash:'SHA-256'},await crypto.subtle.importKey('raw',enc.encode(p),'PBKDF2',false,['deriveBits']),256));
const accts=()=>{try{return JSON.parse(L.getItem('mp_accts'))||{}}catch{return{}}};
const done=u=>{L.setItem('mp_auth',JSON.stringify(u));location.reload()};
let sb=null;
const loadSb=()=>new Promise((r,j)=>{if(sb)return r(sb);const e=document.createElement('script');e.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';e.onload=()=>{sb=supabase.createClient(C.SB_URL,C.SB_KEY);r(sb)};e.onerror=()=>j(new Error('Не удалось загрузить Supabase'));document.head.appendChild(e)});
const fromSb=u=>({id:'sb_'+u.id,name:(u.user_metadata&&(u.user_metadata.name||u.user_metadata.full_name))||u.email.split('@')[0],email:u.email,cloud:1});
window.logout=async()=>{try{if(U&&U.cloud){await (await loadSb()).auth.signOut()}}catch{}L.removeItem('mp_auth');location.reload()};
const css=`#ag{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,var(--bg) 78%,transparent);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);overflow:auto}
#ag .bx{width:min(420px,100%);padding:28px 24px;border-radius:30px;background:color-mix(in srgb,var(--pn) 80%,transparent);border:1px solid var(--edge);box-shadow:0 40px 90px -30px #000c;display:flex;flex-direction:column;gap:12px}
#ag h1{margin:0;font:800 30px/1.1 var(--disp);letter-spacing:-.03em}#ag p{margin:0 0 6px;color:var(--mu);font-size:14px}
#ag .tabs{display:flex;gap:6px;padding:4px;border-radius:16px;background:var(--pn2)}#ag .tabs button{flex:1;padding:10px;border-radius:12px;font-weight:600}#ag .tabs .on{background:var(--ac);color:var(--bg)}
#ag input{width:100%;min-height:48px;font-size:16px;padding:12px 15px;border-radius:15px;background:color-mix(in srgb,var(--pn) 60%,transparent);border:1px solid var(--edge)}
#ag input:focus{outline:none;border-color:var(--ac)}
#ag .go{min-height:50px;border-radius:16px;font-weight:700;background:var(--ac);color:var(--bg)}
#ag .soc{display:flex;gap:8px}#ag .soc button{flex:1;min-height:48px;border-radius:15px;border:1px solid var(--edge);font-weight:600;background:var(--pn2)}
#ag .or{text-align:center;color:var(--mu);font-size:12px}#ag .er{color:#ff6b6b;font-size:13px;min-height:18px}
#ag .sk{background:none;color:var(--mu);font-size:13px;text-decoration:underline}
.acc{margin-top:8px;border:1px solid var(--edge);border-radius:15px;padding:9px 12px;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
html.m #side>.acc{flex:none;margin:0 0 0 6px;max-width:92px;font-size:11px}
html[data-lay=top]:not(.m) #side>.acc{margin:0 0 0 6px;flex:none}`;
document.head.insertAdjacentHTML('beforeend','<style>'+css+'</style>');
const gate=(first)=>{
  let mode='in',pe='',cd=0,tm=0;
  const d=document.createElement('div');d.id='ag';document.body.appendChild(d);
  const P={in:'Войди в аккаунт, чтобы открыть свою музыку',up:'Создай аккаунт: мы отправим код на почту',code:'Введи код из письма',forgot:'Отправим код для смены пароля',reset:'Введи код из письма и новый пароль'};
  const inp=(id,ph,ty,ac,extra='')=>`<input id="${id}" type="${ty}" placeholder="${ph}" autocomplete="${ac}" ${extra}>`;
  const draw=msg=>{
    let f='';
    if(!cloud)f='<div class="er" style="min-height:0">Вход ещё не подключён к базе данных (нужны SB_URL и SB_KEY в начале файла). Пока можно зайти как гость.</div>';
    else if(mode=='in')f=inp('ae','Почта','email','email','inputmode="email"')+inp('ap','Пароль','password','current-password')+'<div class="er" id="aer"></div><button class="go" id="ago">Войти</button><button class="sk" data-m="forgot">Забыли пароль?</button>';
    else if(mode=='up')f=inp('an','Имя','text','nickname')+inp('ae','Почта','email','email','inputmode="email"')+inp('ap','Пароль (от 6 символов)','password','new-password')+'<div class="er" id="aer"></div><button class="go" id="ago">Получить код</button>';
    else if(mode=='forgot')f=inp('ae','Почта','email','email','inputmode="email"')+'<div class="er" id="aer"></div><button class="go" id="ago">Отправить код</button><button class="sk" data-m="in">Назад</button>';
    else f=`<p style="text-align:center">Код отправлен на <b>${pe}</b></p>`+inp('ac','Код из письма','text','one-time-code','inputmode="numeric" maxlength="10" style="text-align:center;letter-spacing:.3em;font-size:22px"')+(mode=='reset'?inp('ap','Новый пароль (от 6 символов)','password','new-password'):'')+'<div class="er" id="aer"></div><button class="go" id="ago">'+(mode=='reset'?'Сменить пароль':'Подтвердить')+'</button><button class="sk" id="arsd">Отправить код ещё раз</button><button class="sk" data-m="in">Назад</button>';
    const tabs=(mode=='in'||mode=='up')?`<div class="tabs"><button data-m="in" class="${mode=='in'?'on':''}">Вход</button><button data-m="up" class="${mode=='up'?'on':''}">Регистрация</button></div>`:'';
    const soc=cloud&&(mode=='in'||mode=='up')&&(C.GOOGLE||C.VK_PROVIDER)?`<div class="or">или</div><div class="soc">${C.GOOGLE?'<button data-o="google">Google</button>':''}${C.VK_PROVIDER?'<button data-o="'+C.VK_PROVIDER+'">VK</button>':''}</div>`:'';
    d.innerHTML=`<div class="bx"><h1>Music Player</h1><p>${cloud?P[mode]:'Аккаунты'}</p>${tabs}${f}${soc}<button class="sk" id="ask">Продолжить как гость</button></div>`;
    if(msg)err(msg)};
  const err=t=>{const e=d.querySelector('#aer');if(e)e.textContent=t};
  const v=id=>(d.querySelector('#'+id)||{}).value||'';
  const human=e=>{const m=e.message||'';return /rate limit|too many|seconds/i.test(m)?'Слишком часто. Подожди минуту и попробуй снова':/expired|invalid/i.test(m)&&/token|otp|code/i.test(m)?'Неверный или просроченный код':/Invalid login/i.test(m)?'Неверная почта или пароль':/sending|smtp|email/i.test(m)&&/error|fail/i.test(m)?'Не удалось отправить письмо. Проверь настройки почты в Supabase':m||'Ошибка'};
  draw(first);
  const submit=async()=>{
    if(!cloud)return;
    const em=v('ae').trim().toLowerCase(),pw=v('ap'),nm=v('an').trim(),co=v('ac').replace(/\s/g,'');
    try{
      if(mode=='in'||mode=='up'||mode=='forgot'){
        if(!/^\S+@\S+\.\S+$/.test(em))return err('Введи правильную почту');
        if(mode!='forgot'&&pw.length<6)return err('Пароль: минимум 6 символов')}
      err('Секунду…');const c=await loadSb();
      if(mode=='up'){
        const{data,error}=await c.auth.signUp({email:em,password:pw,options:{data:{name:nm}}});if(error)throw error;
        if(data.user&&data.user.identities&&!data.user.identities.length)return err('Такая почта уже зарегистрирована. Войди или восстанови пароль');
        if(data.session)return done(fromSb(data.user));
        pe=em;mode='code';draw();cool()}
      else if(mode=='in'){
        const{data,error}=await c.auth.signInWithPassword({email:em,password:pw});
        if(error){if(/not confirmed/i.test(error.message)){await c.auth.resend({type:'signup',email:em});pe=em;mode='code';draw('Почта не подтверждена. Отправили новый код');return cool()}throw error}
        done(fromSb(data.user))}
      else if(mode=='code'){
        if(co.length<6)return err('Введи код из письма');
        const{data,error}=await c.auth.verifyOtp({email:pe,token:co,type:'signup'});if(error)throw error;done(fromSb(data.user))}
      else if(mode=='forgot'){
        const{error}=await c.auth.resetPasswordForEmail(em);if(error)throw error;pe=em;mode='reset';draw();cool()}
      else if(mode=='reset'){
        if(co.length<6)return err('Введи код из письма');if(pw.length<6)return err('Пароль: минимум 6 символов');
        const{data,error}=await c.auth.verifyOtp({email:pe,token:co,type:'recovery'});if(error)throw error;
        const r=await c.auth.updateUser({password:pw});if(r.error)throw r.error;done(fromSb(r.data.user))}
    }catch(e){err(human(e))}};
  const cool=()=>{cd=60;clearInterval(tm);const t=()=>{const b=d.querySelector('#arsd');if(!b)return clearInterval(tm);if(cd>0){b.disabled=true;b.textContent='Отправить код ещё раз ('+cd+' с)';cd--}else{b.disabled=false;b.textContent='Отправить код ещё раз';clearInterval(tm)}};t();tm=setInterval(t,1000)};
  d.addEventListener('click',async e=>{const t=e.target.closest('button');if(!t)return;
    if(t.dataset.m){mode=t.dataset.m;draw()}
    else if(t.id=='ago')submit();
    else if(t.id=='arsd'){try{const c=await loadSb();const r=mode=='reset'?await c.auth.resetPasswordForEmail(pe):await c.auth.resend({type:'signup',email:pe});if(r.error)throw r.error;err('Новый код отправлен');cool()}catch(x){err(human(x))}}
    else if(t.id=='ask'){d.remove();chip()}
    else if(t.dataset.o){try{const c=await loadSb();const{error}=await c.auth.signInWithOAuth({provider:t.dataset.o,options:{redirectTo:location.origin+location.pathname}});if(error)throw error}catch(x){err(human(x))}}});
  d.addEventListener('keydown',e=>{if(e.key=='Enter')submit()});
};
window.openAuth=()=>{if(!document.getElementById('ag'))gate()};
const chip=()=>{if(document.querySelector('.acc'))return;const b=document.createElement('button');b.className='acc';b.title=U?'Профиль':'Войти';b.textContent=U?U.name:'Войти';b.onclick=()=>{if(!U)return openAuth();view='prof';S.view='prof';persist();openPl=null;render()};document.getElementById('side').appendChild(b)};
addEventListener('DOMContentLoaded',async()=>{
  if(U){chip();if(U.cloud&&cloud)loadSb().then(c=>c.auth.getSession()).then(r=>{if(r&&r.data&&!r.data.session){L.removeItem('mp_auth');location.reload()}}).catch(()=>{});return}
  if(cloud){try{const c=await loadSb();const{data}=await c.auth.getSession();if(data.session)return done(fromSb(data.session.user))}catch{}}
  const qq=new URLSearchParams((location.hash||'').replace(/^#/,'')+'&'+location.search.replace(/^\?/,'')),eo=qq.get('error_description')||qq.get('error');
  if(eo){try{history.replaceState(null,'',location.pathname)}catch{}}
  gate(eo?'Google: '+decodeURIComponent(eo).replace(/\+/g,' '):'')});
})();