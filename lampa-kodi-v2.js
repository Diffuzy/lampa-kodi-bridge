(function () {
    'use strict';

    if (window.lampa_kodi_bridge_v2_loaded) return;
    window.lampa_kodi_bridge_v2_loaded = true;

    var TAG = '[KodiBridge]';
    var COMPONENT = 'kodi_bridge';
    var SERVICE_URI = 'luna://com.custom.lampakodi.service';
    var settingsReady = false;
    var playerHookReady = false;
    var initAttempts = 0;

    function log() {
        try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch (e) {}
    }

    function notify(text) {
        try { if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text); } catch (e) {}
    }

    function storage(name, fallback) {
        try {
            var v = Lampa.Storage.field(name);
            return (v === undefined || v === null || v === '') ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function enabled() {
        var v = storage('kodi_bridge_enable', true);
        return v === true || v === 'true' || v === 1 || v === '1';
    }

    function isWebOS() {
        try {
            return !!(window.webOS && webOS.service && webOS.service.request);
        } catch (e) {
            return false;
        }
    }

    function playableUrl(data) {
        if (!data) return '';
        var url = String(data.url || '');
        if (!/^https?:\/\//i.test(url)) return '';
        if (/youtube\.com|youtu\.be/i.test(url)) return '';
        return url;
    }

    function fallbackToLampa(data, text) {
        notify('Kodi Bridge: ' + text);
        if (!data) return;
        data.__kodi_bridge_bypass = true;
        setTimeout(function () {
            try { Lampa.Player.play(data); } catch (e) {}
        }, 50);
    }

    function sendToKodi(data, url) {
        var tempo = parseFloat(storage('kodi_bridge_tempo', '1.5')) || 1.5;
        var username = String(storage('kodi_bridge_user', 'kodi'));
        var password = String(storage('kodi_bridge_password', ''));
        var port = parseInt(storage('kodi_bridge_port', '8080'), 10) || 8080;

        try {
            webOS.service.request(SERVICE_URI, {
                method: 'play',
                parameters: {
                    url: url,
                    tempo: tempo,
                    username: username,
                    password: password,
                    port: port
                },
                onSuccess: function (response) {
                    if (!response || response.returnValue === false) {
                        fallbackToLampa(data, (response && response.errorText) || 'помилка сервісу');
                    } else {
                        log('Kodi started', response);
                    }
                },
                onFailure: function (error) {
                    var msg = error && (error.errorText || error.message);
                    fallbackToLampa(data, msg || 'сервіс недоступний');
                }
            });
        } catch (e) {
            fallbackToLampa(data, e.message || String(e));
        }
    }

    function addSettings() {
        if (settingsReady) return true;
        if (!window.Lampa || !Lampa.SettingsApi || !Lampa.SettingsApi.addComponent || !Lampa.SettingsApi.addParam) return false;

        try {
            Lampa.SettingsApi.addComponent({
                component: COMPONENT,
                name: 'Kodi Bridge',
                icon: '',
                before: 'more'
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {name: 'kodi_bridge_enable', type: 'trigger', default: true},
                field: {
                    name: 'Відкривати відео в Kodi',
                    description: 'Перехоплювати онлайн-відео Lampa і запускати його через Kodi'
                }
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {
                    name: 'kodi_bridge_tempo',
                    type: 'select',
                    values: {
                        '1.0': '1.0×',
                        '1.25': '1.25×',
                        '1.5': '1.5×',
                        '1.75': '1.75×',
                        '2.0': '2.0×'
                    },
                    default: '1.5'
                },
                field: {
                    name: 'Швидкість',
                    description: 'Швидкість відтворення у Kodi'
                }
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {name: 'kodi_bridge_user', type: 'input', default: 'kodi'},
                field: {name: 'Kodi HTTP username'}
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {name: 'kodi_bridge_password', type: 'input', default: ''},
                field: {name: 'Kodi HTTP password'}
            });

            Lampa.SettingsApi.addParam({
                component: COMPONENT,
                param: {name: 'kodi_bridge_port', type: 'input', default: '8080'},
                field: {name: 'Kodi HTTP port'}
            });

            settingsReady = true;
            log('settings registered');
            notify('Kodi Bridge v2 завантажено');
            return true;
        } catch (e) {
            log('settings error', e);
            return false;
        }
    }

    function addPlayerHook() {
        if (playerHookReady) return true;
        if (!window.Lampa || !Lampa.Player || !Lampa.Player.listener || !Lampa.Player.listener.follow) return false;

        try {
            Lampa.Player.listener.follow('create', function (e) {
                if (!enabled() || !isWebOS() || !e || !e.data) return;

                var data = e.data;
                if (data.__kodi_bridge_bypass) {
                    delete data.__kodi_bridge_bypass;
                    return;
                }

                if (data.iptv || data.tv || data.torrent_hash) return;

                var url = playableUrl(data);
                if (!url) return;

                if (typeof e.abort === 'function') e.abort();
                notify('Kodi: запуск відео…');
                sendToKodi(data, url);
            });
            playerHookReady = true;
            log('player hook registered');
            return true;
        } catch (e) {
            log('player hook error', e);
            return false;
        }
    }

    function initRetry() {
        initAttempts++;
        addSettings();
        addPlayerHook();

        if ((!settingsReady || !playerHookReady) && initAttempts < 40) {
            setTimeout(initRetry, 500);
        }
    }

    // CUB can inject a plugin after Lampa is already running, so do not rely
    // only on the app-ready event. Retry until SettingsApi and Player exist.
    setTimeout(initRetry, 0);
})();
