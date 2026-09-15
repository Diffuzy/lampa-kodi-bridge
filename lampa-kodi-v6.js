(function(){
  'use strict';

  if(window.lampa_kodi_bridge_v6_loaded) return;
  window.lampa_kodi_bridge_v6_loaded = true;

  var BRIDGE_APP_ID='com.custom.lampakodi';
  var hookReady=false;
  var attempts=0;

  function notify(text){
    try{
      if(window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text,{time:5000});
    }catch(e){}
  }

  function playableUrl(data){
    if(!data) return '';
    var url=String(data.url||'');
    if(!/^https?:\/\//i.test(url)) return '';
    if(/youtube\.com|youtu\.be/i.test(url)) return '';
    return url;
  }

  function launchBridge(url){
    if(!(window.webOS && webOS.service && webOS.service.request)){
      notify('Kodi Bridge: webOS API недоступний');
      return;
    }

    try{
      webOS.service.request('luna://com.webos.applicationManager',{
        method:'launch',
        parameters:{
          id:BRIDGE_APP_ID,
          params:{
            action:'play',
            url:url,
            tempo:1.5
          }
        },
        onSuccess:function(){
          notify('Kodi Bridge: bridge-app запущено');
        },
        onFailure:function(e){
          notify('Kodi Bridge launch FAIL: '+String((e&&(e.errorText||e.message))||'unknown'));
        }
      });
    }catch(e){
      notify('Kodi Bridge launch FAIL: '+String(e.message||e));
    }
  }

  function handlePlay(e){
    if(!e || !e.data) return;
    var data=e.data;
    if(data.iptv || data.tv || data.torrent_hash) return;

    var url=playableUrl(data);
    if(!url) return;

    if(typeof e.abort==='function') e.abort();
    notify('Kodi Bridge: перехоплено, запускаю Kodi');
    launchBridge(url);
  }

  function addHook(){
    if(hookReady) return true;
    if(!window.Lampa || !Lampa.Player || !Lampa.Player.listener || !Lampa.Player.listener.follow) return false;
    try{
      Lampa.Player.listener.follow('create',handlePlay);
      hookReady=true;
      notify('Kodi Bridge v6 активний');
      return true;
    }catch(e){return false;}
  }

  function init(){
    attempts++;
    addHook();
    if(!hookReady && attempts<60) setTimeout(init,500);
  }

  setTimeout(init,0);
})();
