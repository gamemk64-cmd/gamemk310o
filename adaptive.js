/* v6: адаптив — авто-масштаб под экран (ПК/ТВ) и единое правило «это телефон» */
window.MQP='(max-width:820px),(max-height:520px) and (pointer:coarse)';
window.AK=function(){try{
  var md=(typeof S!=='undefined'&&S.mode)||'auto';
  var ph=md=='phone'||(md=='auto'&&matchMedia(MQP).matches);
  if(ph)return 1;
  var k=Math.min(innerWidth/1280,innerHeight/720);
  return Math.max(1,Math.min(2.2,Math.round(k*20)/20))}catch(e){return 1}};