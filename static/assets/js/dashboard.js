// ============================================================
//  DASHBOARD MAIN
// ============================================================
import { 
    loadMarkers, filterMarkersByType, 
    map, allMarkers, 
    TIMOR_BOUNDS, streetLayer, satelliteLayer 
} from './map.js';
import { initCards } from './cards.js';

// Points data from Django
const pointsData = [
    {% for point in points %}
    {
        id: {{ point.id }},
        naran: "{{ point.Maps.naran|escapejs }}",
        tipo: "{{ point.Maps.tipo|cut:' '|escapejs }}",
        latitude: {{ point.latitude }},
        longitude: {{ point.longitude }},
        municipality: "{{ point.Maps.municipality.name|default:''|escapejs }}",
        village: "{{ point.Maps.village.name|default:''|escapejs }}",
        obs: "{{ point.Maps.Obs|default:''|escapejs }}",
        data_registu: "{{ point.Maps.data_registu|date:'d/m/Y' }}",
        photos: [
            {% for image in point.images.all %}
            { url: "{{ image.image.url }}", description: "{{ image.description|default:''|escapejs }}" }{% if not forloop.last %},{% endif %}
            {% endfor %}
        ]
    }{% if not forloop.last %},{% endif %}
    {% endfor %}
];

// ============================================================
//  INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    
    // Load markers
    loadMarkers(pointsData);
    
    // Init cards
    initCards();

    // ---------- FILTER ----------
    document.querySelectorAll('.filter-item').forEach(function(item) {
        item.addEventListener('click', function() {
            const tipo = this.dataset.tipo;
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            filterMarkersByType(tipo);
            window.location.hash = 'mapa-section';
        });
    });

    // ---------- FULLSCREEN ----------
    const mapContainer = document.querySelector('.map-container');
    const fullscreenBtn = document.getElementById('fullscreen-map');

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (mapContainer.requestFullscreen) mapContainer.requestFullscreen();
            else if (mapContainer.webkitRequestFullscreen) mapContainer.webkitRequestFullscreen();
            else if (mapContainer.msRequestFullscreen) mapContainer.msRequestFullscreen();
            mapContainer.classList.add('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Normal';
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
            mapContainer.classList.remove('fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        }
    }

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    function handleFullscreenChange() {
        if (!document.fullscreenElement) {
            mapContainer.classList.remove('fullscreen');
            if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Fullscreen';
        } else {
            mapContainer.classList.add('fullscreen');
            if (fullscreenBtn) fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Normal';
        }
        setTimeout(() => map.invalidateSize(), 100);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    // ---------- RESET MAP ----------
    document.getElementById('reset-map').addEventListener('click', function() {
        map.fitBounds(TIMOR_BOUNDS, { animate: true, duration: 1, padding: [50, 50] });
        document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
        document.querySelector('.filter-item[data-tipo="all"]').classList.add('active');
        filterMarkersByType('all');
    });

    // ---------- TOGGLE VIEW (Satélite/Normal) ----------
    let currentLayer = 'street';
    document.getElementById('toggle-view').addEventListener('click', function() {
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

    // ---------- ZOOM TO TIMOR-LESTE ----------
    document.getElementById('zoom-out-tl').addEventListener('click', function() {
        map.fitBounds(TIMOR_BOUNDS, { animate: true, duration: 1, padding: [50, 50] });
    });
});