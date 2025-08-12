importScripts('https://www.gstatic.com/firebasejs/7.11.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/7.11.0/firebase-messaging.js');
firebase.initializeApp({
    apiKey:             'AIzaSyCMagGPLVM2pmaOc0uM6DXIV-FDdSEpxjg',
    projectId:          'tdvremote',
    messagingSenderId:  '498700427739',
    appId:              '1:498700427739:web:fecf2f1441975690b247fe'
});

var messaging;
if (firebase.messaging.isSupported())
    messaging = firebase.messaging();

self.addEventListener('install', function(event)
{
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function(event)
{
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event)
{
    var request = event.request;
    if ((request.cache === 'only-if-cached') && (request.mode !== 'same-origin'))
        return;
    if (request.url.indexOf('swbypass=true') >= 0)
        return;
    event.respondWith(fetch(request).then(function(response)
        {
            return response;
        },
        function(error)
        {
            return caches.match(request, {ignoreSearch: true, ignoreMethod: true}).then(function(response)
            {
                return response || error;
            });
        }));
});