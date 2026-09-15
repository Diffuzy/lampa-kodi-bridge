(function(){
  'use strict';

  if(window.lampa_kodi_bridge_v5_debug_loaded) return;
  window.lampa_kodi_bridge_v5_debug_loaded = true;

  var SERVICE_URI = 'luna://com.custom.lampakodi.service';
  var PASSWORD_KEY = 'kodi_bridge_password';
  var hookReady = false;
  var attempts = 0;

  function notify(text){
    try{
      if(window.Lampa && Lampa.Noty && Lampa.Noty.show){
        Lampa.Noty.show(text,{time:8000});
      }
    }catch(e){}
  }

  function getPassword(){
    try{
      var v = Lampa.Storage.get(PASSWORD_KEY,'');
      return v ? String(v) : '';
    }catch(e){ return ''; }
  }

  function savePassword(v){
    try{ Lampa.Storage.set(PASSWORD_KEY,String(v)); }catch(e){}
  }

  function errText(e){
    if(!e) return 'unknown error';
    var parts=[];
    if(e.errorCode !== undefined) parts.push('code='+e.errorCode);
    if(e.errorText) parts.push(e.errorText);
    else if(e.message) parts.push(e.message);
    try{
      if(!parts.length) parts.push(JSON.stringify(e));
    }catch(x){}
    return parts.join(' | ') || 'unknown error';
  }

  function serviceRequest(method,parameters,onSuccess,onFailure){
    try{
      if(!(window.webOS && webOS.service && webOS.service.request)){
        onFailure({errorText:'webOS service API unavailable'});
        return;
      }
      webOS.service.request(SERVICE_URI,{
        method:method,
        parameters:parameters || {},
        onSuccess:onSuccess,
        onFailure:onFailure
      });
    }catch(e){
      onFailure(e);
    }
  }

  function pingBridge(){
    serviceRequest('ping',{},function(r){
      notify('Kodi Bridge PING OK: v'+String((r&&r.version)||'?'));
    },function(e){
      notify('Kodi Bridge PING FAIL: '+errText(e));
    });
  }

  function playableUrl(data){
    if(!data) return '';
    var url=String(data.url||'');
    if(!/^https?:\/\//i.test(url)) return '';
    if(/youtube\.com|youtu\.be/i.test(url)) return '';
    return url;
  }

  function callPlay(url,password){
    notify('Kodi Bridge: sending PLAY...');
    serviceRequest('play',{
      url:url,
      tempo:1.5,
      username:'kodi',
      password:String(password||''),
      port:8080
    },function(r){
      notify('Kodi Bridge PLAY OK: accepted='+String(!!(r&&r.accepted))+' v'+String((r&&r.version)||'?'));
    },function(e){
      notify('Kodi Bridge PLAY FAIL: '+errText(e));
    });
  }

  function askPasswordAndPlay(url){
    if(!window.Lampa || !Lampa.Input || !Lampa.Input.edit){
      notify('Kodi Bridge: cannot open password input');
      return;
    }
    Lampa.Input.edit({title:'Kodi HTTP password',value:'',free:true,nosave:true},function(v){
      if(v){
        savePassword(v);
        callPlay(url,v);
      }else{
        notify('Kodi Bridge: password not entered');
      }
    });
  }

  function handlePlay(e){
    if(!e || !e.data) return;
    var data=e.data;
    if(data.iptv || data.tv || data.torrent_hash) return;

    var url=playableUrl(data);
    if(!url) return;

    if(typeof e.abort==='function') e.abort();

    notify('Kodi Bridge: Bandera intercepted');

    var password=getPassword();
    if(password) callPlay(url,password);
    else askPasswordAndPlay(url);
  }

  function addHook(){
    if(hookReady) return true;
    if(!window.Lampa || !Lampa.Player || !Lampa.Player.listener || !Lampa.Player.listener.follow) return false;
    try{
      Lampa.Player.listener.follow('create',handlePlay);
      hookReady=true;
      notify('Kodi Bridge v5 DEBUG active');
      setTimeout(pingBridge,500);
      return true;
    }catch(e){
      notify('Kodi Bridge hook FAIL: '+errText(e));
      return false;
    }
  }

  function init(){
    attempts++;
    addHook();
    if(!hookReady && attempts<60) setTimeout(init,500);
  }

  setTimeout(init,0);
})();
