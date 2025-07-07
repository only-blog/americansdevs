// sw3.js - Service Worker para modo COMPLETAMENTE OFFLINE
const CACHE_NAME = 'americansdevs-full-offline-v1';
const STATIC_CACHE = 'americansdevs-static-offline-v1';
const DYNAMIC_CACHE = 'americansdevs-dynamic-offline-v1';

// URLs completas para cache offline
const OFFLINE_URLS = [
    '/',
    '/index.html',
    '/offline.html',
    '/manifest.json',
    '/vercel.json',
    '/sw.js'
];

// Recursos externos essenciais
const EXTERNAL_RESOURCES = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalar - Cache TUDO para offline completo
self.addEventListener('install', event => {
    console.log('SW3: Instalando modo OFFLINE COMPLETO...');
    
    event.waitUntil(
        Promise.all([
            // Cache principal
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(OFFLINE_URLS);
            }),
            
            // Cache recursos externos
            caches.open(STATIC_CACHE).then(cache => {
                return cache.addAll(EXTERNAL_RESOURCES);
            }),
            
            // Preparar dados offline completos
            prepareFullOfflineData()
        ]).then(() => {
            console.log('SW3: Tudo cacheado para offline completo');
            self.skipWaiting();
        })
    );
});

// Preparar dados offline completos
function prepareFullOfflineData() {
    return caches.open(DYNAMIC_CACHE).then(cache => {
        const fullOfflineData = {
            mode: 'full-offline',
            posts: [
                {
                    id: 'offline-1',
                    author: 'AmericansDevs',
                    content: 'Você está 100% offline! Todos os dados foram salvos localmente.',
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    comments: []
                },
                {
                    id: 'offline-2',
                    author: 'Sistema',
                    content: 'Crie posts offline que serão sincronizados quando voltar online.',
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    comments: []
                }
            ],
            user: {
                id: 'offline-user',
                name: 'Usuário Offline',
                avatar: null
            },
            features: {
                viewPosts: true,
                createPosts: true,
                uploadImages: false,
                comments: true,
                likes: true,
                sync: true
            }
        };
        
        return cache.put('/api/offline-data', 
            new Response(JSON.stringify(fullOfflineData), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    });
}

// Interceptar TODAS as requisições - Modo offline first
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                console.log('SW3: Servindo do cache (offline):', event.request.url);
                return response;
            }
            
            // Tentar online apenas se absolutamente necessário
            return fetch(event.request).then(response => {
                // Cachear tudo que conseguir
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                
                return response;
            }).catch(() => {
                // Completamente offline - usar fallbacks
                return handleFullOfflineFallback(event.request);
            });
        })
    );
});

// Fallback para modo offline completo
function handleFullOfflineFallback(request) {
    const url = request.url;
    
    // Para navegação, página principal
    if (request.mode === 'navigate') {
        return caches.match('/');
    }
    
    // Para imagens, placeholder offline
    if (request.destination === 'image') {
        return new Response(
            `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#374151"/>
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="14" fill="#9ca3af">
                    📱 OFFLINE
                </text>
            </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
    
    // Para APIs, dados offline
    if (url.includes('/api/')) {
        return caches.match('/api/offline-data');
    }
    
    // Para outros recursos, resposta vazia
    return new Response('Offline', { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
    });
}

// Ativar
self.addEventListener('activate', event => {
    console.log('SW3: Ativando modo OFFLINE COMPLETO');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheName.includes('offline')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim();
        })
    );
});

// Sincronização quando voltar online
self.addEventListener('sync', event => {
    if (event.tag === 'sync-offline-data') {
        event.waitUntil(syncOfflineData());
    }
});

// Função para sincronizar dados offline
function syncOfflineData() {
    return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_OFFLINE_DATA',
                message: 'Sincronizando dados offline...'
            });
        });
    });
}

