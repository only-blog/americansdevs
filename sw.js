// sw.js - Service Worker para americansdevs.vercel.app
const CACHE_NAME = 'americansdevs-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/offline.html',
    // Adicione outros arquivos importantes do seu site
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdn.tailwindcss.com',
    // Firebase URLs (se necessário)
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js'
];

// Instalar o Service Worker
self.addEventListener('install', event => {
    console.log('AmericansDevs SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('AmericansDevs SW: Cache aberto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('AmericansDevs SW: Todos os arquivos cacheados');
                self.skipWaiting();
            })
    );
});

// Interceptar requisições
self.addEventListener('fetch', event => {
    // Ignorar requisições que não são HTTP/HTTPS
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retorna do cache se encontrar
                if (response) {
                    console.log('AmericansDevs SW: Servindo do cache:', event.request.url);
                    return response;
                }
                
                // Tenta fazer a requisição online
                return fetch(event.request).then(response => {
                    // Verifica se a resposta é válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    // Clona a resposta para cache
                    const responseToCache = response.clone();
                    
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    
                    return response;
                }).catch(() => {
                    console.log('AmericansDevs SW: Falha na requisição, servindo offline');
                    
                    // Se for uma navegação, retorna página offline
                    if (event.request.mode === 'navigate') {
                        return caches.match('/html.html');
                    }
                    
                    // Para outros recursos, retorna do cache se disponível
                    return caches.match(event.request);
                });
            })
    );
});

// Atualizar cache
self.addEventListener('activate', event => {
    console.log('AmericansDevs SW: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('AmericansDevs SW: Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('AmericansDevs SW: Ativado com sucesso');
            self.clients.claim();
        })
    );
});

// Sincronização em background
self.addEventListener('sync', event => {
    console.log('AmericansDevs SW: Sincronização em background');
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Aqui você pode adicionar lógica para sincronizar dados
            syncPendingData()
        );
    }
});

// Função para sincronizar dados pendentes
function syncPendingData() {
    return new Promise((resolve) => {
        // Enviar mensagem para a página principal
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'SYNC_PENDING_DATA'
                });
            });
        });
        resolve();
    });
}

// Escutar mensagens da página principal
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Notificações push (se necessário)
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'americansdevs-notification'
        };
        
        event.waitUntil(
            self.registration.showNotification('AmericansDevs', options)
        );
    }
});

// Clique em notificação
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('https://americansdevs.vercel.app')
    );
});

