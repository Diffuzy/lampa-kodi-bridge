(function () {
    'use strict';

    if (window.lampa_kodi_bridge_v1) return;
    window.lampa_kodi_bridge_v1 = true;

    var TAG = '[KodiBridge]';
    var COMPONENT = 'kodi_bridge';
    var SERVICE_URI = 'luna://com.custom.lampakodi.service';
    var pendingRequest = null;

    function log() {
        try { console.log.apply(console, [TAG].concat([].slice.call(arguments))); } catch (e) {}
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
            return !!(Lampa.Platform && Lampa.Platform.is && Lampa.Platform.is('webos') &&
                window.webOS && webOS.service && webOS.service.request);
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
        try { Lampa.Noty.show('Kodi Bridge: ' + text); } catch (e) {}
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
            pendingRequest = webOS.service.request(SERVICE_URI, {
                method: 'play',
                parameters: {
                    url: url,
                    tempo: tempo,
                    username: username,
                    password: password,
                    port: port
                },
                onSuccess: function (response) {
                    pendingRequest = null;
                    if (!response || response.returnValue === false) {
                        fallbackToLampa(data, (response && response.errorText) || 'помилка сервісу');
                    } else {
                        log('Kodi started', response);
                    }
                },
                onFailure: function (error) {
                    pendingRequest = null;
                    var msg = error && (error.errorText || error.message);
                    fallbackToLampa(data, msg || 'сервіс недоступний');
                }
            });
        } catch (e) {
            pendingRequest = null;
            fallbackToLampa(data, e.message || String(e));
        }
    }

    function addSettings() {
        if (!Lampa.SettingsApi) return;

        try {
            Lampa.SettingsApi.addComponent({
                component: COMPONENT,
                name: 'Kodi Bridge',
                icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h4v7l6-7h5l-7 8 7 10h-5l-6-8v8H5z"/></svg>'
            });
        } catch (e) {}

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {name: 'kodi_bridge_enable', type: 'trigger', default: true},
            field: {
                name: 'Відкривати відео в Kodi',
                description: 'Перехоплює звичайне онлайн-відео Lampa і запускає його через Kodi на цьому ТВ'
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
                description: 'Швидкість, яку Kodi встановить після запуску відео'
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
            field: {
                name: 'Kodi HTTP password',
                description: 'Зберігається локально в налаштуваннях Lampa'
            }
        });

        Lampa.SettingsApi.addParam({
            component: COMPONENT,
            param: {name: 'kodi_bridge_port', type: 'input', default: '8080'},
            field: {name: 'Kodi HTTP port'}
        });
    }

    function init() {
        addSettings();

        if (!Lampa.Player || !Lampa.Player.listener) {
            log('Player listener unavailable');
            return;
        }

        Lampa.Player.listener.follow('create', function (e) {
            if (!enabled() || !isWebOS() || !e || !e.data) return;

            var data = e.data;

            if (data.__kodi_bridge_bypass) {
                delete data.__kodi_bridge_bypass;
                return;
            }

            // Leave IPTV/torrents and special players untouched in v0.1.
            if (data.iptv || data.tv || data.torrent_hash) return;

            var url = playableUrl(data);
            if (!url) return;

            if (typeof e.abort === 'function') e.abort();

            try { Lampa.Noty.show('Kodi: запуск відео…'); } catch (err) {}
            log('open', url, 'tempo', storage('kodi_bridge_tempo', '1.5'));
            sendToKodi(data, url);
        });

        log('initialized');
    }

    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
