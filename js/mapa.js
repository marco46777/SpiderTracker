
const mapa = L.map('mapa', { minZoom: 2 }).setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
}).addTo(mapa);

const ARANA = [
    "..X.....X..",
    "...X.X.X...",
    "X..XXXXX..X",
    ".XXXXXXXXX.",
    "..XXXXXXX..",
    ".XXXXXXXXX.",
    "X..XXXXX..X",
    "...X...X...",
    "..X.....X.."
];

function svgArana(color) {
    let rects = '';
    ARANA.forEach((fila, y) => {
        [...fila].forEach((c, x) => {
            if (c === 'X') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
        });
    });
    return `<svg viewBox="0 0 11 9" width="22" height="18"
        fill="${color}" shape-rendering="crispEdges">${rects}</svg>`;
}


function crearMarcador(lat, lng, colorFondo, colorBorde = '#ffffff') {
    const icono = L.divIcon({
        className: '',
        html: `<div class="hex" style="background:${colorBorde}">
                 <div class="hex-in" style="background:${colorFondo}">${svgArana('#111')}</div>
               </div>`,
        iconSize: [40, 44],
        iconAnchor: [20, 22]
    });
    return L.marker([lat, lng], { icon: icono }).addTo(mapa);
}

// ===== AVISTAMIENTOS =====
const VERDES = ['#2f9e44', '#51cf66'];
const OTROS  = ['#e03131', '#4dabf7'];

const avistamientos = [
    { lat: 10.45,  lng: -75.55, color: '#e03131' },
    { lat: 40.71,  lng: -74.0,  color: '#2f9e44' },
    { lat: 51.5,   lng: -0.12,  color: '#51cf66' },
    { lat: -23.55, lng: -46.63, color: '#e03131' },
    { lat: 35.68,  lng: 139.69, color: '#4dabf7' }
];

// [latMin, latMax, lngMin, lngMax]
const REGIONES = [
    [25, 55, -125, -70],   // Norteamérica
    [8, 25, -105, -80],    // Centroamérica
    [4, 11, -77, -72],     // Colombia
    [-40, 5, -75, -40],    // Sudamérica
    [38, 58, -8, 30],      // Europa
    [-30, 30, -15, 40],    // África
    [10, 55, 60, 135],     // Asia
    [-38, -15, 115, 150]   // Oceanía
];

const rand = (a, b) => a + Math.random() * (b - a);
const elegir = arr => arr[Math.floor(Math.random() * arr.length)];

for (let i = 0; i < 70; i++) {
    const r = elegir(REGIONES);
    const color = Math.random() < 0.55 ? elegir(VERDES) : elegir(OTROS);
    avistamientos.push({ lat: rand(r[0], r[1]), lng: rand(r[2], r[3]), color });
}

avistamientos.forEach(a => crearMarcador(a.lat, a.lng, a.color));

// ===== RED DE ARAÑA EN EL MAPA: une cada araña con sus 2 vecinas más cercanas =====
avistamientos.forEach((a, i) => {
    avistamientos
        .map((b, j) => ({ b, j, d: (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2 }))
        .filter(x => x.j !== i)
        .sort((x, y) => x.d - y.d)
        .slice(0, 2)
        .forEach(x => {
            L.polyline([[a.lat, a.lng], [x.b.lat, x.b.lng]], {
                color: '#e9ecef', weight: 1, opacity: 0.45, dashArray: '2 4'
            }).addTo(mapa);
        });
});

// ===== TU UBICACIÓN =====
const marcador = crearMarcador(10.391, -75.479, '#f1f3f5', '#f08c00');

// ===== VISOR DE TELARAÑA (panel en la esquina) =====
const visorWrap = document.createElement('div');
visorWrap.className = 'visor-wrap';

(function construirVisor() {
    const radios = [10, 20, 30, 40, 48];
    const rayos = 8;
    let web = '';

    radios.forEach(r => {
        let d = '';
        for (let k = 0; k < rayos; k++) {
            const a1 = (k / rayos) * Math.PI * 2;
            const a2 = ((k + 1) / rayos) * Math.PI * 2;
            const x1 = 50 + r * Math.cos(a1), y1 = 50 + r * Math.sin(a1);
            const x2 = 50 + r * Math.cos(a2), y2 = 50 + r * Math.sin(a2);
            const am = (a1 + a2) / 2;
            const cx = 50 + r * 0.88 * Math.cos(am), cy = 50 + r * 0.88 * Math.sin(am);
            d += (k === 0 ? `M${x1},${y1} ` : '') + `Q${cx},${cy} ${x2},${y2} `;
        }
        web += `<path d="${d}Z"/>`;
    });
    for (let k = 0; k < rayos; k++) {
        const a = (k / rayos) * Math.PI * 2;
        web += `<line x1="50" y1="50" x2="${50 + 48 * Math.cos(a)}" y2="${50 + 48 * Math.sin(a)}"/>`;
    }

    visorWrap.innerHTML = `
        <div class="visor-borde">
            <div class="visor-web">
                <svg viewBox="0 0 100 100">
                    <g fill="none" stroke="#69db7c" stroke-width="0.3" opacity="0.6">${web}</g>
                    <line class="barrido" x1="50" y1="50" x2="50" y2="2"
                          stroke="#69db7c" stroke-width="0.8" opacity="0.8"/>
                    <g id="visorPuntos"></g>
                </svg>
            </div>
        </div>
        <div class="visor-info" id="visorInfo"></div>`;

    mapa.getContainer().appendChild(visorWrap);
    L.DomEvent.disableClickPropagation(visorWrap);
    L.DomEvent.disableScrollPropagation(visorWrap);
})();

function actualizarVisor() {
    const b = mapa.getBounds();
    const w = b.getWest(), e = b.getEast(), n = b.getNorth(), s = b.getSouth();
    let puntos = '';
    let visibles = 0, verdes = 0;

    avistamientos.forEach(a => {
        if (!b.contains([a.lat, a.lng])) return;
        visibles++;
        if (VERDES.includes(a.color)) verdes++;
        const x = 6 + ((a.lng - w) / (e - w)) * 88;
        const y = 6 + ((n - a.lat) / (n - s)) * 88;
        puntos += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="${a.color}"/>`;
    });

    // Tu ubicación (naranja)
    const p = marcador.getLatLng();
    if (b.contains(p)) {
        const x = 6 + ((p.lng - w) / (e - w)) * 88;
        const y = 6 + ((n - p.lat) / (n - s)) * 88;
        puntos += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.8" fill="#f08c00" stroke="#fff" stroke-width="0.6"/>`;
    }

    document.getElementById('visorPuntos').innerHTML = puntos;
    document.getElementById('visorInfo').textContent = `VISIBLES: ${visibles} | VERDES: ${verdes}`;
}

mapa.on('move zoom', actualizarVisor);
actualizarVisor();

// ===== MÚSICA =====
const audio = document.getElementById('sound');
audio.volume = 0.1;

const eventos = ['click', 'touchstart', 'keydown'];

function arrancar() {
    audio.play().then(() => {
        eventos.forEach(ev => document.removeEventListener(ev, arrancar));
    }).catch(() => {});
}

// Intenta al abrir; si el navegador lo bloquea, espera la primera interacción
audio.play().catch(() => {
    eventos.forEach(ev => document.addEventListener(ev, arrancar));
});

// ===== BOTONES =====
let watchId = null;
let detenido = false;

// Congela o reactiva todas las interacciones del mapa
function congelarMapa(congelar) {
    const acciones = ['dragging', 'touchZoom', 'doubleClickZoom',
                      'scrollWheelZoom', 'boxZoom', 'keyboard'];
    acciones.forEach(a => congelar ? mapa[a].disable() : mapa[a].enable());
    if (mapa.tap) congelar ? mapa.tap.disable() : mapa.tap.enable();
    mapa.getContainer().classList.toggle('detenido', congelar);
}

function detenerPrograma() {
    detenido = true;

    // GPS
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }

    // Música
    audio.pause();
    audio.currentTime = 0;
    eventos.forEach(ev => document.removeEventListener(ev, arrancar));

    // Mapa
    congelarMapa(true);
}

function reanudarPrograma() {
    detenido = false;
    congelarMapa(false);
    audio.play().catch(() => {});
}

document.getElementById('btnAmpliar').addEventListener('click', () => {
    if (detenido) return;
    mapa.zoomIn();
});

document.getElementById('btnStart').addEventListener('click', () => {
    if (!navigator.geolocation) {
        alert('Tu navegador no soporta geolocalización');
        return;
    }
    if (detenido) reanudarPrograma();
    if (watchId !== null) return;

    watchId = navigator.geolocation.watchPosition(
        pos => {
            const p = [pos.coords.latitude, pos.coords.longitude];
            marcador.setLatLng(p);
            mapa.setView(p, 15);
            actualizarVisor();
        },
        err => alert('No se pudo obtener la ubicación: ' + err.message)
    );
});

document.getElementById('btnStop').addEventListener('click', detenerPrograma);

// ===== SPRITE DE OJOS =====
const sprite = document.getElementById('boton-ojos');

function reproducir(clase = 'play') {
    sprite.classList.remove('play', 'reverse', 'loop');
    void sprite.offsetWidth;        // reinicia la animación
    sprite.classList.add(clase);
}

sprite.addEventListener('click', () => reproducir('play'));
// reproducir('reverse');  // para volver a abrir los ojos

const sprite1 = document.getElementById('boton-head');

// ===== PANTALLA DE CARGA =====
const loading = document.getElementById('loading');
const inicio = Date.now();
const MINIMO = 2300;   

window.addEventListener('load', () => {
    const espera = Math.max(0, MINIMO - (Date.now() - inicio));
    setTimeout(() => {
        loading.classList.add('oculto');
        setTimeout(() => loading.remove(), 700);
    }, espera);
});