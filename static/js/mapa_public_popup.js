/* =====================================================================
   MAPA PUBLIC POPUP.JS — KOMPLETU FINAL
   Detail URL: /mapa/detalhe/<id>/
   Botão Rota hasai ona
   ===================================================================== */

(function () {
    'use strict';

    /* =================================================================
       1. KONFIGURASAUN TIPU
       ================================================================= */
    var TIPO_CONFIG = {
        'TurismuRelijiozu': { color: '#9c27b0', icon: 'fa-church'   },
        'TurismoRelijiozu': { color: '#9c27b0', icon: 'fa-church'   },
        'TurismuKultural':  { color: '#ff9800', icon: 'fa-landmark' },
        'TurismuNatural':   { color: '#4caf50', icon: 'fa-mountain' },
        'TurismuIstoriku':  { color: '#795548', icon: 'fa-monument' },
        'TurismuEventura':  { color: '#f44336', icon: 'fa-hiking'   },
        'TurismuEkologiku': { color: '#20a39e', icon: 'fa-leaf'     },
        'default':          { color: '#607d8b', icon: 'fa-leaf'     }
    };

    function normalizeType(tipo) {
        return String(tipo || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '');
    }

    function getTipoConfig(tipo) {
        var key = normalizeType(tipo);
        if (key.indexOf('relijiozu') !== -1) return TIPO_CONFIG['TurismuRelijiozu'];
        if (key.indexOf('kultural')  !== -1) return TIPO_CONFIG['TurismuKultural'];
        if (key.indexOf('natural')   !== -1) return TIPO_CONFIG['TurismuNatural'];
        if (key.indexOf('istoriku')  !== -1) return TIPO_CONFIG['TurismuIstoriku'];
        if (key.indexOf('eventura')  !== -1 || key.indexOf('aventura') !== -1)
                                              return TIPO_CONFIG['TurismuEventura'];
        if (key.indexOf('ekologiku') !== -1) return TIPO_CONFIG['TurismuEkologiku'];
        return TIPO_CONFIG.default;
    }

    /* =================================================================
       2. ICON MARKER
       ================================================================= */
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

    /* =================================================================
       3. UTILITÁRIU
       ================================================================= */
    function escapeQuotes(str) {
        return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
    function getPointId(p) {
        return p.id || p.pk || null;
    }
    function getPointName(p) {
        return p.naran || p.name || p.titulo || 'Sem naran';
    }
    function getPointType(p) {
        return p.tipo || p.type || 'Turizmu';
    }
    function getPointImage(p) {
        if (p.image_url) return p.image_url;
        if (Array.isArray(p.images) && p.images[0] && p.images[0].url) return p.images[0].url;
        return null;
    }
    function getPointDesc(p) {
        return p.Obs || p.observation || p.description || '';
    }
    function getPointLoc(p) {
        var muni = p.municipality || '';
        var vill = p.village || '';
        if (typeof muni === 'object' && muni.name) muni = muni.name;
        if (typeof vill === 'object' && vill.name) vill = vill.name;
        var parts = [muni, vill].filter(Boolean);
        return parts.length ? parts.join(' › ') : 'Timor-Leste';
    }
    function getDetailUrl(p) {
        var id = getPointId(p);
        if (!id) return '#';
        if (p.detail_url) return p.detail_url;
        // ⭐ URL tuir urls.py: /mapa/detalhe/<int:pk>/
        return '/mapa/detalhe/' + id + '/';
    }

    /* =================================================================
       4. POPUP HTML — BOTÃO DETALLU DEIT
       ================================================================= */
    function buildPopupHTML(point) {
        var cfg      = getTipoConfig(getPointType(point));
        var imgUrl   = getPointImage(point);
        var name     = getPointName(point);
        var type     = getPointType(point);
        var loc      = getPointLoc(point);
        var desc     = getPointDesc(point);
        var detailUrl= getDetailUrl(point);
        var safeName = escapeQuotes(name);

        var img = imgUrl
            ? '<img src="' + imgUrl + '" class="tl-popup__img" alt="' + safeName + '">'
            : '<div class="tl-popup__img tl-popup__img--empty"><i class="fas fa-camera"></i></div>';

        var descHTML = desc
            ? '<p class="tl-popup__desc">' + desc + '</p>'
            : '';

        return '' +
            '<div class="tl-popup">' +
                img +
                '<div class="tl-popup__body">' +
                    '<span class="tl-popup__type" style="background:' + cfg.color + ';">' +
                        '<i class="fas ' + cfg.icon + '"></i> ' + type +
                    '</span>' +
                    '<h3 class="tl-popup__title">' + name + '</h3>' +
                    '<div class="tl-popup__loc">' +
                        '<i class="fas fa-map-marker-alt"></i> ' + loc +
                    '</div>' +
                    descHTML +
                    /* ⭐ BOTÃO DETALLU DEIT */
                    '<a class="tl-popup__btn-full" href="' + detailUrl + '">' +
                        '<i class="fas fa-info-circle"></i> Haree Detallu' +
                    '</a>' +
                '</div>' +
            '</div>';
    }

    /* =================================================================
       5. KONTAJEN
       ================================================================= */
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
        var cluster = window.tlMarkerCluster ||
                      (typeof markerCluster !== 'undefined' ? markerCluster : null);
        var m = window.tlMap || (typeof map !== 'undefined' ? map : null);
        if (!cluster || !m) return 0;
        var visible = 0;
        cluster.eachLayer(function (layer) {
            if (m.hasLayer(layer)) visible++;
        });
        return visible;
    }

    /* =================================================================
       6. EXPOSE BA GLOBAL
       ================================================================= */
    window.tlUpdateVisibleCount = updateVisibleCount;
    window.tlRecountFromCluster = recountFromCluster;
    window.tlMakeTipoIcon        = makeTipoIcon;
    window.tlBuildPopupHTML      = buildPopupHTML;

    /* =================================================================
       7. HOOK FILTRU & RESET
       ================================================================= */
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

        setTimeout(function () {
            var total = recountFromCluster();
            updateVisibleCount(total, false);
        }, 300);
    });

})();
