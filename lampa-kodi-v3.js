(function(){
  'use strict';

  if(window.lampa_kodi_bridge_v3_loaded) return;
  window.lampa_kodi_bridge_v3_loaded = true;

  var TAG='[KodiBridge v3]';
  var SERVICE_URI='luna://com.custom.lampakodi.service';
  var hookReady=false;
  var promptShown=false;
  var attempts=0;

  function log(){ try{ console.log.apply(console,[TAG].concat([].slice.call(arguments))); }catch(e){} }
  function notify(t){ try{ if(window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(t); }catch(e){} }
  function get(k,d){ try{ var v=Lampa.Storage.get(k,d); return (v===undefined||v===null||v==='')?d:v; }catch(e){ return d; } }
  function set(k,v){ try{ Lampa.Storage.set(k,v); }catch(e){} }

  function askPassword(){
    if(promptShown) return;
    if(!window.Lampa || !Lampa.Input || !Lampa.Input.edit || !Lampa.Storage) return;
    if(get('kodi_bridge_password','')) return;
    promptShown=true;
    Lampa.Input.edit({
      title:'Kodi HTTP password',
      value:'',
      free:true,
      nosave:true
    },function(v){
      if(v){
        set('kodi_bridge_password',String(v));
        notify('Kodi Bridge: пароль збережено');
      }else{
        promptShown=false;
        notify('Kodi Bridge: пароль не задано');
      }
    });
  }

  function playableUrl(data){
    if(!data) return '';
    var url=String(data.url||'');
    if(!/^https?:\/\//i.test(url)) return '';
    if(/youtube\.com|youtu\.be/i.test(url)) return '';
    return url;
  }

  function fallback(data,text){
    notify('Kodi Bridge: '+text);
    if(!data) return;
    data.__kodi_bridge_bypass=true;
    setTimeout(function(){ try{ Lampa.Player.play(data); }catch(e){} },50);
  }

  function send(data,url){
    var password=String(get('kodi_bridge_password',''));
    if(!password){
      askPassword();
      fallback(data,'спочатку введи пароль Kodi');
      return;
    }

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
          password:password,
          port:8080
        },
        onSuccess:function(r){
          if(!r || r.returnValue===false) fallback(data,(r&&r.errorText)||'помилка bridge');
          else log('success',r);
        },
        onFailure:function(e){
          fallback(data,(e&&(e.errorText||e.message))||'bridge недоступний');
        }
      });
    }catch(e){ fallback(data,e.message||String(e)); }
  }

  function addHook(){
    if(hookReady) return true;
    if(!window.Lampa || !Lampa.Player || !Lampa.Player.listener || !Lampa.Player.listener.follow) return false;

    try{
      Lampa.Player.listener.follow('create',function(e){
        if(!e || !e.data) return;
        var data=e.data;

        if(data.__kodi_bridge_bypass){
          delete data.__kodi_bridge_bypass;
          return;
        }
        if(data.iptv || data.tv || data.torrent_hash) return;

        var url=playableUrl(data);
        if(!url) return;

        if(typeof e.abort==='function') e.abort();
        notify('Kodi: запуск 1.5×…');
        send(data,url);
      });
      hookReady=true;
      log('player hook ready');
      notify('Kodi Bridge v3 завантажено');
      askPassword();
      return true;
    }catch(e){
      log('hook error',e);
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
