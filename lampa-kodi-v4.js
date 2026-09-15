(function(){
  'use strict';

  if(window.lampa_kodi_bridge_v4_loaded) return;
  window.lampa_kodi_bridge_v4_loaded = true;

  var TAG = '[KodiBridge v4]';
  var SERVICE_URI = 'luna://com.custom.lampakodi.service';
  var PASSWORD_KEY = 'kodi_bridge_password';
  var hookReady = false;
  var attempts = 0;

  function log(){
    try{ console.log.apply(console,[TAG].concat([].slice.call(arguments))); }catch(e){}
  }

  function notify(text){
    try{
      if(window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
    }catch(e){}
  }

  function getPassword(){
    try{
      var v = Lampa.Storage.get(PASSWORD_KEY,'');
      return v ? String(v) : '';
    }catch(e){
      return '';
    }
  }

  function savePassword(v){
    try{ Lampa.Storage.set(PASSWORD_KEY,String(v)); }catch(e){}
  }

  function playableUrl(data){
    if(!data) return '';
    var url = String(data.url || '');
    if(!/^https?:\/\//i.test(url)) return '';
    if(/youtube\.com|youtu\.be/i.test(url)) return '';
    return url;
  }

  function fallback(data,text){
    notify('Kodi Bridge: ' + text);
    if(!data) return;

    data.__kodi_bridge_v4_bypass = true;
    setTimeout(function(){
      try{ Lampa.Player.play(data); }catch(e){}
    },80);
  }

  function callBridge(data,url,password){
    if(!(window.webOS && webOS.service && webOS.service.request)){
      fallback(data,'webOS service API недоступний');
      return;
    }

    try{
      webOS.service.request(SERVICE_URI,{
        method:'play',
        parameters:{
          url:url,
          tempo:1.5,
          username:'kodi',
          password:String(password || ''),
          port:8080
        },
        onSuccess:function(r){
          if(!r || r.returnValue === false){
            fallback(data,(r && r.errorText) || 'помилка bridge');
            return;
          }
          log('accepted',r);
        },
        onFailure:function(e){
          fallback(data,(e && (e.errorText || e.message)) || 'bridge недоступний');
        }
      });
    }catch(e){
      fallback(data,e.message || String(e));
    }
  }

  function askPasswordAndPlay(data,url){
    if(!window.Lampa || !Lampa.Input || !Lampa.Input.edit){
      fallback(data,'неможливо ввести пароль Kodi');
      return;
    }

    Lampa.Input.edit({
      title:'Kodi HTTP password',
      value:'',
      free:true,
      nosave:true
    },function(v){
      if(v){
        savePassword(v);
        notify('Kodi: запуск 1.5x');
        callBridge(data,url,v);
      }else{
        fallback(data,'пароль Kodi не введено');
      }
    });
  }

  function handlePlay(e){
    if(!e || !e.data) return;

    var data = e.data;

    if(data.__kodi_bridge_v4_bypass){
      delete data.__kodi_bridge_v4_bypass;
      return;
    }

    if(data.iptv || data.tv || data.torrent_hash) return;

    var url = playableUrl(data);
    if(!url) return;

    if(typeof e.abort === 'function') e.abort();

    var password = getPassword();
    if(!password){
      askPasswordAndPlay(data,url);
      return;
    }

    notify('Kodi: запуск 1.5x');
    callBridge(data,url,password);
  }

  function addHook(){
    if(hookReady) return true;
    if(!window.Lampa || !Lampa.Player || !Lampa.Player.listener || !Lampa.Player.listener.follow) return false;

    try{
      Lampa.Player.listener.follow('create',handlePlay);
      hookReady = true;
      log('player hook ready');
      notify('Kodi Bridge 1.5x активний');
      return true;
    }catch(e){
      log('hook error',e);
      return false;
    }
  }

  function init(){
    attempts++;
    addHook();
    if(!hookReady && attempts < 60) setTimeout(init,500);
  }

  setTimeout(init,0);
})();
