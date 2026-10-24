/* Installed edition only: registers the offline service worker and reports whether every asset is cached.
   Not included in the standalone single-file build. */
(function(){
'use strict';
var status=document.getElementById('offlineStatus');
function say(text){if(status)status.textContent=text}
if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
if(!window.isSecureContext){say('OFFLINE COPY NEEDS HTTPS');return}
function ask(worker){
  if(!worker)return;
  var channel=new MessageChannel();
  channel.port1.onmessage=function(e){var d=e.data||{};say(d.ready?'OFFLINE READY · '+d.version:'SAVING OFFLINE COPY · '+d.cached+'/'+d.total)};
  worker.postMessage({type:'status'},[channel.port2]);
}
say('SAVING OFFLINE COPY…');
navigator.serviceWorker.register('sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(reg){ask(reg.active)}).catch(function(err){say('OFFLINE COPY FAILED · '+(err&&err.message||err))});
navigator.serviceWorker.addEventListener('controllerchange',function(){ask(navigator.serviceWorker.controller)});
})();
