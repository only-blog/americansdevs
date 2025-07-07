// sw2.js - Service Worker para modo SEM SALDO (dados ligados)
const CACHE_NAME = 'americansdevs-no-credit-v1';
const STATIC_CACHE = 'americansdevs-static-no-credit-v1';
const DYNAMIC_CACHE = 'americansdevs-dynamic-no-credit-v1';

// URLs mínimas essenciais
const MINIMAL_URLS = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Instalar - Cache super leve
self.addEventListener('install', event => {
    console.log('SW2: Instalando modo SEM SALDO...');
    
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(MINIMAL_URLS);
            }),
            
            // Preparar dados básicos offline
            prepareNoCreditData()
        ]).then(() => {
            console.log('SW2: Modo sem saldo ativado');
            self.skipWaiting();
        })
    );
});

// Preparar dados para modo sem saldo
function prepareNoCreditData() {
    return caches.open(DYNAMIC_CACHE).then(cache => {
        const noCreditData = {
            mode: 'no-credit',
            posts: [
                {
                    id: 'no-credit-1',
                    author: 'AmericansDevs',
                    content: 'Modo Econômico ativado! Você pode navegar básico sem gastar saldo.',
                    timestamp: new Date().toISOString(),
                    likes: 0,
                    comments: []
                }
            ],
            features: {
                viewPosts: true,
                createPosts: true,
                uploadImages: false,
                comments: true,
                likes: true
            }
        };
        
        return cache.put('/api/no-credit-data', 
            new Response(JSON.stringify(noCreditData), {
                headers: { 'Content-Type': 'application/json' }
            })
        );
    });
}

// Interceptar requisições - Estratégia ultra econômica
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Bloquear requisições pesadas quando sem saldo
    if (isHeavyRequest(url)) {
        event.respondWith(
            caches.match(event.request).then(response => {
                if (response) {
                    return response;
                }
                
                // Retornar conteúdo leve alternativo
                return createLightResponse(event.request);
            })
        );
        return;
    }
    
    // Para requisições leves, tentar cache primeiro
    event.respondWith(
        caches.match(event.request).then(response => {
            if (response) {
                console.log('SW2: Servindo do cache (sem saldo):', url);
                return response;
            }
            
            // Tentar requisição mínima online
            return fetch(event.request, {
                // Configurações para economizar dados
                cache: 'force-cache',
                credentials: 'omit',
                mode: 'cors'
            }).then(response => {
                // Cachear apenas se for pequeno
                if (response.headers.get('content-length') < 10000) { // Menos de 10KB
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                
                return response;
            }).catch(() => {
                // Falha na requisição - usar dados em cache
                return handleNoCreditFallback(event.request);
            });
        })
    );
});

// Verificar se é requisição pesada
function isHeavyRequest(url) {
    const heavyPatterns = [
        '/images/',
        '/uploads/',
        '/media/',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.mp4',
        '.webm',
        'youtube.com',
        'vimeo.com'
    ];
    
    return heavyPatterns.some(pattern => url.includes(pattern));
}

// Criar resposta leve
function createLightResponse(request) {
    const url = request.url;
    
    // Para imagens, retornar placeholder SVG mínimo
    if (request.destination === 'image') {
        return new Response(
            `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#e5e7eb"/>
                <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12" fill="#6b7280">
                    📷
                </text>
            </svg>`,
            { 
                headers: { 
                    'Content-Type': 'image/svg+xml',
                    'Cache-Control': 'max-age=31536000'
                } 
            }
        );
    }
    
    // Para vídeos, retornar placeholder
    if (url.includes('video') || url.includes('.mp4')) {
        return new Response('Video indisponível no modo econômico', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
    
    // Para APIs, retornar dados em cache
    if (url.includes('/api/')) {
        return caches.match('/api/no-credit-data');
    }
    
    return new Response('Conteúdo não disponível no modo econômico', {
        headers: { 'Content-Type': 'text/plain' }
    });
}

// Fallback para modo sem saldo
function handleNoCreditFallback(request) {
    if (request.mode === 'navigate') {
        return caches.match('/');
    }
    
    return caches.match('/api/no-credit-data');
}

// Ativar
self.addEventListener('activate', event => {
    console.log('SW2: Ativando modo SEM SALDO');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheName.includes('no-credit')) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim();
        })
    );
});

