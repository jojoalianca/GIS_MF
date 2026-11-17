document.addEventListener('DOMContentLoaded', function () {
    // ===== SIDEBAR TOGGLE =====
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const openBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');

    function openSidebar() {
        if (sidebar) sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Close sidebar on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
            closeSidebar();
        }
    });

    // Close sidebar when clicking a link (mobile)
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                setTimeout(closeSidebar, 300);
            }
        });
    });

    // ===== SWIPER INIT =====
    if (typeof Swiper !== 'undefined') {
        document.querySelectorAll('.card-slideshow .swiper').forEach(el => {
            new Swiper(el, {
                loop: true,
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev'
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true
                },
                autoplay: {
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                },
                speed: 600
            });
        });
    }

    // ===== MAP INIT =====
    const mapElement = document.getElementById('map');
    if (!mapElement) return; // Garanti la iha erro se element #map la iha iha pajina ne'e

    const timorBounds = [[-9.5, 124.0], [-8.0, 127.5]];
    const map = L.map('map').fitBounds(timorBounds);

    // Garanti katak URL tiles sira uzu HTTPS atu prevene Mixed Content iha Render (Render uzu HTTPS por padraun)
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
    });

    // ===== COLORS & ICONS =====
    const tipoColors = {
        'Turismo Relijiozu': '#FF6B6B',
        'Turismu Kultural': '#4ECDC4',
        'Turismu Natural': '#45B7D1',
        'Turismu Istoriku': '#96CEB4',
        'Turismu Eventura': '#FFEAA7',
        'Turismu Ekologiku': '#55EFC4'
    };

    const tipoIcons = {
        'Turismo Relijiozu': 'fa-church',
        'Turismu Kultural': 'fa-landmark',
        'Turismu Natural': 'fa-mountain',
        'Turismu Istoriku': 'fa-monument',
        'Turismu Eventura': 'fa-hiking',
        'Turismu Ekologiku': 'fa-leaf'
    };

    // ===== POINTS DATA =====
    const pointsData = [
        {% for point in points %}
        {
            id: {{ point.id }},
            naran: "{{ point.Maps.naran|escapejs }}",
            tipo: "{{ point.Maps.tipo|cut:' '|escapejs }}",
            lat: {{ point.latitude|default:"null" }},
            lng: {{ point.longitude|default:"null" }},
            municipality: "{{ point.Maps.municipality.name|default:''|escapejs }}",
            village: "{{ point.Maps.village.name|default:''|escapejs }}",
            obs: "{{ point.Maps.Obs|default:''|escapejs }}",
            data: "{{ point.Maps.data_registu|date:'d/m/Y' }}",
            photos: [
                {% for img in point.images.all %}
                {
                    url: "{{ img.image.url }}",
                    desc: "{{ img.description|default:''|escapejs }}"
                }{% if not forloop.last %},{% endif %}
                {% endfor %}
            ]
        }{% if not forloop.last %},{% endif %}
        {% endfor %}
    ];

    // ===== MARKERS =====
    const clusterGroup = L.markerClusterGroup({
        iconCreateFunction: function (cluster) {
            const markers = cluster.getAllChildMarkers();
            const counts = {};
            let mainColor = '#666';
            markers.forEach(m => {
                const tipo = m.options.data.tipo;
                counts[tipo] = (counts[tipo] || 0) + 1;
            });
            let max = 0;
            for (const tipo in counts) {
                if (counts[tipo] > max) {
                    max = counts[tipo];
                    mainColor = tipoColors[tipo] || '#666';
                }
            }
            return L.divIcon({
                html: `<div style="background:${mainColor};width:40px;height:40px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,0.3);">${cluster.getChildCount()}</div>`,
                className: 'cluster-custom',
                iconSize: [40, 40]
            });
        },
        maxClusterRadius: 50
    });

    let allMarkers = [];

    function createMarker(point) {
        const color = tipoColors[point.tipo] || '#666';
        const icon = tipoIcons[point.tipo] || 'fa-map-marker';
        const html = `
            <div style="width:40px;height:40px;background:${color};border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.2s;">
                <i class="fas ${icon}" style="color:#fff;font-size:1rem;"></i>
            </div>
        `;
        const iconDiv = L.divIcon({
            html: html,
            className: 'custom-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        const marker = L.marker([point.lat, point.lng], { icon: iconDiv, data: point });

        // Placeholder SVG inline ne'ebé seguru (la presiza load imagem husi via.placeholder.com via HTTP)
        const fallbackImg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='100' viewBox='0 0 300 100'%3E%3Crect width='300' height='100' fill='%231a6b3c'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='sans-serif' font-size='16'%3ETimor%3C/text%3E%3C/svg%3E";

        const photosHTML = point.photos.length > 0 ? `
            <div style="margin:8px 0;height:100px;overflow:hidden;border-radius:6px;position:relative;">
                <img src="${point.photos[0].url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.onerror=null;this.src='${fallbackImg}';">
                ${point.photos.length > 1 ? `<span style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:#fff;padding:1px 8px;border-radius:10px;font-size:0.7rem;">+${point.photos.length - 1}</span>` : ''}
            </div>
        ` : '';

        const desc = point.obs ? point.obs.substring(0, 80) + (point.obs.length > 80 ? '...' : '') : 'La iha deskrisaun';

        marker.bindPopup(`
            <div style="width:260px;max-width:260px;font-family:inherit;">
                <div style="background:${color};color:#fff;padding:10px 14px;border-radius:6px 6px 0 0;">
                    <h6 style="margin:0;font-weight:700;">${point.naran}</h6>
                    <small style="opacity:0.9;">${point.tipo}</small>
                </div>
                <div style="padding:12px;background:#fff;">
                    <div style="font-size:0.85rem;color:#555;margin-bottom:6px;">
                        <i class="fas fa-map-marker-alt" style="color:var(--primary);"></i> ${point.municipality || 'Município'} ${point.village ? '> ' + point.village : ''}
                    </div>
                    <div style="font-size:0.8rem;color:#444;background:#f8f9fa;padding:6px 10px;border-radius:4px;margin-bottom:8px;">
                        ${desc}
                    </div>
                    ${photosHTML}
                    <div style="display:flex;gap:6px;margin-top:8px;">
                        <button class="zoom-btn" data-lat="${point.lat}" data-lng="${point.lng}" style="flex:1;background:${color};color:#fff;border:none;padding:5px;border-radius:4px;font-size:0.75rem;font-weight:600;cursor:pointer;">
                            <i class="fas fa-search-plus"></i> Zoom
                        </button>
                        <a href="/mapa/detalhe/${point.id}/" style="flex:1;background:var(--primary);color:#fff;border:none;padding:5px;border-radius:4px;font-size:0.75rem;font-weight:600;text-align:center;text-decoration:none;">
                            <i class="fas fa-eye"></i> Detalhes
                        </a>
                    </div>
                </div>
            </div>
        `, { className: 'custom-popup', maxWidth: 280, minWidth: 280 });

        marker.on('popupopen', function (e) {
            setTimeout(() => {
                const btn = e.target.getPopup().getElement().querySelector('.zoom-btn');
                if (btn) {
                    btn.addEventListener('click', function () {
                        map.setView([parseFloat(this.dataset.lat), parseFloat(this.dataset.lng)], 16);
                        map.closePopup();
                    });
                }
            }, 100);
        });

        return marker;
    }

    function loadMarkers() {
        clusterGroup.clearLayers();
        allMarkers = [];
        pointsData.forEach(point => {
            if (point.lat && point.lng) {
                const marker = createMarker(point);
                allMarkers.push(marker);
                clusterGroup.addLayer(marker);
            }
        });
        map.addLayer(clusterGroup);

        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.1));
            }
        }
    }

    function filterMarkers(tipo) {
        clusterGroup.clearLayers();
        const filtered = tipo === 'all' ? allMarkers : allMarkers.filter(m => m.options.data.tipo === tipo);
        filtered.forEach(m => clusterGroup.addLayer(m));
        if (filtered.length > 0) {
            const group = new L.featureGroup(filtered);
            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.1));
            }
        } else {
            map.fitBounds(timorBounds);
        }
    }

    // ===== FILTER EVENTS =====
    document.querySelectorAll('.filter-item').forEach(item => {
        item.addEventListener('click', function () {
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            const tipo = this.dataset.tipo;
            filterMarkers(tipo);
            const mapaSec = document.getElementById('mapa-section');
            if (mapaSec) mapaSec.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // ===== MAP CONTROLS =====
    let currentLayer = 'street';
    const toggleBtn = document.getElementById('toggle-view');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            if (currentLayer === 'street') {
                map.removeLayer(streetLayer);
                map.addLayer(satelliteLayer);
                currentLayer = 'satellite';
                this.innerHTML = '<i class="fas fa-map"></i> Normal';
            } else {
                map.removeLayer(satelliteLayer);
                map.addLayer(streetLayer);
                currentLayer = 'street';
                this.innerHTML = '<i class="fas fa-satellite"></i> Satélite';
            }
        });
    }

    const zoomOutBtn = document.getElementById('zoom-out-tl');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function () {
            map.fitBounds(timorBounds, { animate: true, duration: 1 });
        });
    }

    const resetBtn = document.getElementById('reset-map');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            map.fitBounds(timorBounds, { animate: true, duration: 1 });
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            const defaultFilter = document.querySelector('.filter-item[data-tipo="all"]');
            if (defaultFilter) defaultFilter.classList.add('active');
            filterMarkers('all');
        });
    }

    // ===== FULLSCREEN =====
    const mapContainer = document.querySelector('.map-container');
    const fullscreenBtn = document.getElementById('fullscreen-map');
    if (fullscreenBtn && mapContainer) {
        fullscreenBtn.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                if (mapContainer.requestFullscreen) mapContainer.requestFullscreen();
                else if (mapContainer.webkitRequestFullscreen) mapContainer.webkitRequestFullscreen();
                mapContainer.classList.add('fullscreen');
                this.innerHTML = '<i class="fas fa-compress"></i> Normal';
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                mapContainer.classList.remove('fullscreen');
                this.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
            }
        });
    }

    document.addEventListener('fullscreenchange', function () {
        if (!document.fullscreenElement && mapContainer && fullscreenBtn) {
            mapContainer.classList.remove('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        }
        setTimeout(() => map.invalidateSize(), 150);
    });

    // ===== CARD BUTTONS =====
    document.querySelectorAll('.btn-map').forEach(btn => {
        btn.addEventListener('click', function () {
            const tipo = this.dataset.tipo;
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            const target = document.querySelector(`.filter-item[data-tipo="${tipo}"]`);
            if (target) target.classList.add('active');
            else {
                const def = document.querySelector('.filter-item[data-tipo="all"]');
                if (def) def.classList.add('active');
            }
            filterMarkers(tipo);
            const mapaSec = document.getElementById('mapa-section');
            if (mapaSec) mapaSec.scrollIntoView({ behavior: 'smooth' });
        });
    });

    document.querySelectorAll('.btn-detail').forEach(btn => {
        btn.addEventListener('click', function () {
            window.location.href = `/mapa/detalhe/${this.dataset.mapaId}/`;
        });
    });

    // ===== INIT & RESIZE FIX FOR RENDER =====
    loadMarkers();
    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 1000);
});
