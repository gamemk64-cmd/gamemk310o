/* ---------- init ---------- */
(async()=>{
  try{db=await idb();(await tx('readonly',s=>s.getAll())).forEach(t=>T.set(t.id,t))}catch(e){toast('Хранилище недоступно — библиотека не сохранится')}
  if(!S.keep){S.shuf=false;S.rep=0;S.sense='';S.night=false}
  if(S.theme===undefined)S.theme='dark';if(S.ae===undefined)S.ae=true;if(S.cap===undefined)S.cap=.75;S.theme?root.dataset.theme=S.theme:delete root.dataset.theme;
  view=S.view||'home';SO=S.so||'added';setAccent(40);
  S.fav=S.fav.filter(i=>T.has(i));setVol(S.vol);applyEq();
  ctxList=(S.ctx||[]).length?S.ctx:[...T.keys()];
  if(S.cur&&T.has(S.cur)){play(S.cur,null,S.pos||0.01);au.pause()}
  render();requestAnimationFrame(frame);
  if(T.size)toast(`Библиотека восстановлена: ${T.size} песен`);
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
  upgradeTags();
  if(S.sense=='mic'&&navigator.permissions)navigator.permissions.query({name:'microphone'}).then(r=>{if(r.state=='granted')startSense('mic')}).catch(()=>{});
})();