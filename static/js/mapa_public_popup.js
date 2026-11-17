/* =====================================================================
   MAPA PUBLIC — POPUP MODERNU, MARKER TUIR TIPU, ROTA, KONTAJEN
   ===================================================================== */

(function () {
    'use strict';

    /* -----------------------------------------------------------------
       1. KONFIGURASAUN TIPU
       ----------------------------------------------------------------- */
    var TIPO_CONFIG = {
        'TurismuRelijiozu': { color: '#9c27b0', icon: 'fa-church'   },
        'TurismoRelijiozu': { color: '#9c27b0', icon: 'fa-church'   },
        'TurismuKultural':  { color: '#ff9800', icon: 'fa-landmark' },
        'TurismuNatural':   { color: '#4caf50', icon: 'fa-mountain' },
        'TurismuIstoriku':  { color: '#795548', icon: 'fa-monument' },
        'TurismuEventura':  { color: '#f44336', icon: 'fa-hiking'   },
        'default':          { color: '#607d8b', icon: 'fa-leaf'     }
    };

    function getTipoConfig(tipo) {
        if (!tipo) return TIPO_CONFIG.default;
        var key = String(tipo).replace(/\s+/g, '');
        return TIPO_CONFIG[key] || TIPO_CONFIG.default;
    }

    /* -----------------------------------------------------------------
       2. ICON MARKER
       ----------------------------------------------------------------- */
    function makeTipoIcon(tipo, isNearest) {
        var cfg = getTipoConfig(tipo);
        var cls = 'tl-marker-pin' + (isNearest ? ' is-nearest' : '');
        return L.divIcon({
            className: 'tl-marker-wrapper',
            html: '<div class="' + cls + '" style="background:' + cfg.color + ';">' +
                  '<i class="fas ' + cfg.icon + '"></i></div>',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32]
        });
    }

    /* -----------------------------------------------------------------
       3. POPUP HTML
       ----------------------------------------------------------------- */
    function escapeQuotes(str) {
        return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    function buildPopupHTML(point) {
        var cfg = getTipoConfig(point.tipo);
        var img = point.image_url
            ? '<img src="' + point.image_url + '" class="tl-popup__img" alt="' + (point.naran || '') + '">'
            : '<div class="tl-popup__img tl-popup__img--empty"><i class="fas fa-camera"></i></div>';

        var loc = [point.municipality, point.village].filter(Boolean).join(' › ') || 'Timor-Leste';
        var safeName = escapeQuotes(point.naran);

        return '' +
            '<div class="tl-popup">' +
                img +
                '<div class="tl-popup__body">' +
                    '<span class="tl-popup__type" style="background:' + cfg.color + ';">' +
                        '<i class="fas ' + cfg.icon + '"></i> ' + (point.tipo || 'Turizmu') +
                    '</span>' +
                    '<h3 class="tl-popup__title">' + (point.naran || 'Sem naran') + '</h3>' +
                    '<div class="tl-popup__loc">' +
                        '<i class="fas fa-map-marker-alt"></i> ' + loc +
                    '</div>' +
                    '<div class="tl-popup__actions">' +
                        '<button type="button" class="tl-popup__btn tl-popup__btn--route" ' +
                            'onclick="tlStartRoute(' + point.lat + ',' + point.lng + ',\'' + safeName + '\')">' +
                            '<i class="fas fa-route"></i> Rota' +
                        '</button>' +
                        '<a class="tl-popup__btn tl-popup__btn--detail" href="/mapa/' + point.id + '/">' +
                            '<i class="fas fa-info-circle"></i> Detallu' +
                        '</a>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }

    /* -----------------------------------------------------------------
       4. KONTAJEN
       ----------------------------------------------------------------- */
    function updateVisibleCount(count, isFiltered) {
        var badge = document.getElementById('map-count-badge');
        var text  = document.getElementById('map-count-text');
        var hero  = document.getElementById('stat-live-count');
        var wrap  = document.getElementById('stat-live-wrap');

        if (text) text.textContent = count + ' fatin';
        if (badge) badge.classList.toggle('is-filtered', !!isFiltered);
        if (hero) hero.textContent = count;
        if (wrap) wrap.style.display = isFiltered ? 'flex' : 'none';
    }

    function recountFromCluster() {
        if (typeof markerCluster === 'undefined' || !markerCluster) return 0;
        var visible = 0;
        markerCluster.eachLayer(function (m) {
            if (map.hasLayer(m)) visible++;
        });
        return visible;
    }

    /* -----------------------------------------------------------------
       5. ROTA
       ----------------------------------------------------------------- */
    var routingControl = null;

    window.tlStartRoute = function (destLat, destLng, destName) {
        var currentUser = (typeof userLatLng !== 'undefined' && userLatLng)
            ? userLatLng : (window.userLatLng || null);

        if (!currentUser) {
            alert('Klik "GPS Hau" uluk atu hatene ita-nia fatin.');
            return;
        }
        if (!map) return;

        if (routingControl) {
            map.removeControl(routingControl);
            routingControl = null;
        }

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(currentUser.lat, currentUser.lng),
                L.latLng(destLat, destLng)
            ],
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1'
            }),
            lineOptions: {
                styles: [{ color: '#0d6efd', weight: 6, opacity: 0.85 }]
            },
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: true,
            show: false,
            createMarker: function () { return null; }
        }).addTo(map);

        routingControl.on('routesfound', function (e) {
            var route = e.routes[0];
            var distKm = (route.summary.totalDistance / 1000).toFixed(1);
            var mins   = Math.round(route.summary.totalTime / 60);

            var destEl = document.getElementById('info-dest');
            var roadEl = document.getElementById('info-road');
            var timeEl = document.getElementById('info-time');
            var strEl  = document.getElementById('info-straight');

            if (destEl) destEl.textContent = destName;
            if (roadEl) roadEl.textContent = distKm + ' km';
            if (timeEl) timeEl.textContent =
                mins >= 60
                    ? Math.floor(mins / 60) + 'h ' + (mins % 60) + 'min'
                    : mins + ' min';

            var straight = map.distance(
                L.latLng(currentUser.lat, currentUser.lng),
                L.latLng(destLat, destLng)
            ) / 1000;
            if (strEl) strEl.textContent = straight.toFixed(1) + ' km';

            var panel = document.getElementById('route-panel');
            if (panel) panel.classList.add('show');

            var clr = document.getElementById('clear-route');
            if (clr) clr.style.display = 'flex';

            map.closePopup();
        });

        routingControl.on('routingerror', function () {
            alert('La konsege kalkula rota. Verifika internet.');
        });
    };

    /* -----------------------------------------------------------------
       6. LISTA FATIN BESIK LIU
       ----------------------------------------------------------------- */
    window.tlShowNearest = function (list) {
        var container = document.getElementById('nearest-list');
        if (!container) return;

        if (!list || !list.length) {
            container.innerHTML = '<div class="p-3 text-muted small text-center">La hetan fatin.</div>';
            return;
        }

        var html = '';
        list.forEach(function (it) {
            var cfg = getTipoConfig(it.tipo);
            html +=
                '<div class="nearest-item" onclick="tlStartRoute(' + it.lat + ',' + it.lng + ',\'' +
                    escapeQuotes(it.naran) + '\')" style="cursor:pointer;">' +
                    '<span class="nearest-dot" style="background:' + cfg.color + ';">' +
                        '<i class="fas ' + cfg.icon + '"></i>' +
                    '</span>' +
                    '<div class="nearest-info">' +
                        '<div class="nearest-name">' + (it.naran || '-') + '</div>' +
                        '<div class="nearest-meta">' + it.distance_km + ' km · ' + (it.tipo || '') + '</div>' +
                    '</div>' +
                '</div>';
        });
        container.innerHTML = html;

        var panel = document.getElementById('nearest-panel');
        if (panel) panel.classList.add('show');
    };

    /* -----------------------------------------------------------------
       7. EXPOSE BA GLOBAL
       ----------------------------------------------------------------- */
    window.tlUpdateVisibleCount = updateVisibleCount;
    window.tlRecountFromCluster = recountFromCluster;
    window.tlMakeTipoIcon        = makeTipoIcon;
    window.tlBuildPopupHTML      = buildPopupHTML;

    /* -----------------------------------------------------------------
       8. HOOK FILTRU & RESET
       ----------------------------------------------------------------- */
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('.filter-item').forEach(function (item) {
            item.addEventListener('click', function () {
                setTimeout(function () {
                    var visible = recountFromCluster();
                    updateVisibleCount(visible, this.dataset.tipo !== 'all');
                }.bind(this), 120);
            });
        });

        var resetBtn = document.getElementById('reset-map');
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                setTimeout(function () {
                    var total = recountFromCluster();
                    updateVisibleCount(total, false);
                }, 150);
            });
        }

        // Inisial kontajen
        setTimeout(function () {
            var total = recountFromCluster();
            updateVisibleCount(total, false);
        }, 300);
    });

})();