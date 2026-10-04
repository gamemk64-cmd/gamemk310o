/* v5: кнопки «Очередь» и «Бит-режим» в панели плеера */
(()=>{const v=document.getElementById('vol'),mu=document.getElementById('mu');
const mk=(id,ic,t,fn)=>{const b=document.createElement('button');b.id=id;b.title=t;b.setAttribute('aria-label',t);b.innerHTML=ICO(ic);b.onclick=fn;v.insertBefore(b,mu)};
mk('qb','q','Очередь',()=>{view='q';S.view='q';persist();openPl=null;render()});
mk('bb2','beats','Бит-режим',()=>bmOpen());})();