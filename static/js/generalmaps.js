/* =====================================================================
   GENERALMAPS.JS — KOMPLETU FINAL
   Popup Rua + 4 Modu + Auto-Update Distánsia + Labele Taka Kontrolu GPS
   ===================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    /* =================================================================
       1. ELEMENTU HTML
       ================================================================= */
    const mapEl = document.getElementById("map");

    const gpsBtn         = document.getElementById("gps-btn")          || document.getElementById("locateButton");
    const nearestBtn     = document.getElementById("nearest-btn")      || document.getElementById("nearestButton");
    const toggleViewBtn  = document.getElementById("toggle-view")      || document.getElementById("toggleMapButton");
    const clearRouteBtn  = document.getElementById("clear-route")      || document.getElementById("clearRouteButton");
    const fullscreenBtn  = document.getElementById("fullscreen-map");

    const infoDest       = document.getElementById("info-dest")        || document.getElementById("destinationName");
    const infoStraight   = document.getElementById("info-straight")    || document.getElementById("destinationDistance");
    const infoRoad       = document.getElementById("info-road")        || document.getElementById("routeDistance");
    const infoTime       = document.getElementById("info-time")        || document.getElementById("routeDuration");
    const routePanel     = document.getElementById("route-panel");
    const closeRoutePanel= document.getElementById("close-route-panel");

    const nearestPanel   = document.getElementById("nearest-panel");
    const nearestList    = document.getElementById("nearest-list")     || document.getElementById("nearestList");
    const closeNearestBtn= document.getElementById("close-nearest-panel");

    const mapCountBadge  = document.getElementById("map-count-badge");
    const mapCountText   = document.getElementById("map-count-text");
    const statLiveWrap   = document.getElementById("stat-live-wrap");
    const statLiveCount  = document.getElementById("stat-live-count");

    const filterItems    = document.querySelectorAll(".filter-item");
    const resetBtn       = document.getElementById("reset-map");

    /* =================================================================
       2. VERIFIKA
       ================================================================= */
    if (!mapEl || typeof L === "undefined") {
        console.error("Leaflet ka elementu #map la hetan.");
        return;
    }

    const API_URL = mapEl.dataset.apiUrl || "/api/turismu-points/";
    if (!L.Routing) console.warn("Leaflet Routing Machine la karrega.");

    /* =================================================================
       3. INISIALIZA MAPA
       ================================================================= */
    const map = L.map("map").setView([-9.0, 125.8], 10);

    const streetLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { attribution: "&copy; OpenStreetMap", maxZoom: 19 }
    ).addTo(map);

    const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "&copy; Esri", maxZoom: 19 }
    );

    let currentLayer = "street";
    if (toggleViewBtn) {
        toggleViewBtn.addEventListener("click", function () {
            if (currentLayer === "street") {
                map.removeLayer(streetLayer);
                satelliteLayer.addTo(map);
                currentLayer = "satellite";
                toggleViewBtn.innerHTML = '<i class="fas fa-map"></i> <span class="btn-label">Estrada</span>';
            } else {
                map.removeLayer(satelliteLayer);
                streetLayer.addTo(map);
                currentLayer = "street";
                toggleViewBtn.innerHTML = '<i class="fas fa-satellite"></i> <span class="btn-label">Satélite</span>';
            }
        });
    }

    /* =================================================================
       4. MARKER CLUSTER
       ================================================================= */
    let markerCluster;
    if (typeof L.markerClusterGroup === "function") {
        markerCluster = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
        });
        map.addLayer(markerCluster);
    } else {
        markerCluster = L.layerGroup().addTo(map);
    }

    /* =================================================================
       5. KONFIGURASAUN TIPU
       ================================================================= */
    const TIPO_CONFIG = {
        "TurismuRelijiozu": { color: "#9c27b0", icon: "fa-church"   },
        "TurismoRelijiozu": { color: "#9c27b0", icon: "fa-church"   },
        "TurismuKultural":  { color: "#ff9800", icon: "fa-landmark" },
        "TurismuNatural":   { color: "#4caf50", icon: "fa-mountain" },
        "TurismuIstoriku":  { color: "#795548", icon: "fa-monument" },
        "TurismuEventura":  { color: "#f44336", icon: "fa-hiking"   },
        "TurismuEkologiku": { color: "#20a39e", icon: "fa-leaf"     },
        "default":          { color: "#607d8b", icon: "fa-leaf"     },
    };

    function normalizeType(tipo) {
        return String(tipo || "").trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    }
    function getTipoConfig(tipo) {
        const key = normalizeType(tipo);
        if (key.includes("relijiozu")) return TIPO_CONFIG["TurismuRelijiozu"];
        if (key.includes("kultural"))  return TIPO_CONFIG["TurismuKultural"];
        if (key.includes("natural"))   return TIPO_CONFIG["TurismuNatural"];
        if (key.includes("istoriku"))  return TIPO_CONFIG["TurismuIstoriku"];
        if (key.includes("eventura") || key.includes("aventura")) return TIPO_CONFIG["TurismuEventura"];
        if (key.includes("ekologiku")) return TIPO_CONFIG["TurismuEkologiku"];
        return TIPO_CONFIG.default;
    }

    function makeTipoIcon(tipo, isNearest) {
        const cfg = getTipoConfig(tipo);
        const cls = "tl-marker-pin" + (isNearest ? " is-nearest" : "");
        return L.divIcon({
            className: "tl-marker-wrapper",
            html: '<div class="' + cls + '" style="background:' + cfg.color + ';">' +
                  '<i class="fas ' + cfg.icon + '"></i></div>',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -32],
        });
    }

    /* =================================================================
       6. ESTADU & KONFIGURASAUN
       ================================================================= */
    let currentPosition   = null;
    let currentMarker     = null;
    let accuracyCircle    = null;
    let routeControl      = null;
    let destinationMarker = null;
    let allPlaces         = [];
    let placeMarkers      = {};
    let activeFilter      = "all";

    const TRAVEL_MODES = {
        walk:      { label: "Lao ain",   icon: "fa-walking",    speed: 4.5, color: "#28a745" },
        bicycle:   { label: "Bisikleta", icon: "fa-bicycle",    speed: 15,  color: "#17a2b8" },
        motorbike: { label: "Motor",     icon: "fa-motorcycle", speed: 40,  color: "#fd7e14" },
        car:       { label: "Kareta",    icon: "fa-car",        speed: 35,  color: "#0d6efd" },
    };

    /* =================================================================
       7. UTILITÁRIU
       ================================================================= */
    function escapeQuotes(str) {
        return String(str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
    }
    function haversineMeters(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = Math.PI / 180;
        const dLat = (lat2 - lat1) * toRad;
        const dLon = (lon2 - lon1) * toRad;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
                  Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }
    function formatDistance(meters) {
        if (!Number.isFinite(meters)) return "--";
        if (meters < 1000) return Math.round(meters) + " m";
        return (meters / 1000).toFixed(2) + " km";
    }
    function formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return "--";
        const totalMin = Math.round(seconds / 60);
        if (totalMin < 1) return "< 1 min";
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        if (h > 0 && m > 0) return h + "h " + m + "min";
        if (h > 0) return h + "h";
        return m + " min";
    }
    function estimateTravelTimes(roadMeters) {
        if (!Number.isFinite(roadMeters) || roadMeters <= 0) return null;
        const km = roadMeters / 1000;
        const result = {};
        Object.keys(TRAVEL_MODES).forEach(function (key) {
            const mode = TRAVEL_MODES[key];
            const seconds = (km / mode.speed) * 3600;
            result[key] = {
                seconds: seconds,
                text: formatDuration(seconds),
                label: mode.label,
                icon: mode.icon,
                color: mode.color,
            };
        });
        return result;
    }
    function updateVisibleCount(count, isFiltered) {
        if (mapCountText) mapCountText.textContent = count + " fatin";
        if (mapCountBadge) mapCountBadge.classList.toggle("is-filtered", !!isFiltered);
        if (statLiveCount) statLiveCount.textContent = count;
        if (statLiveWrap) statLiveWrap.style.display = isFiltered ? "flex" : "none";
    }

    /* =================================================================
       8. SAFE OPEN POPUP — ATU LABELE TAKA KONTROLU GPS
       ================================================================= */
    function safeOpenPopup(marker) {
        if (!marker) return;
        const popup = marker.getPopup();
        if (popup) {
            popup.options.autoPan = true;
            // Fo espasu 120px iha leten (ba botão GPS) no 80px iha okos
            popup.options.autoPanPaddingTopLeft     = L.point(40, 140);
            popup.options.autoPanPaddingBottomRight = L.point(40, 80);
        }
        marker.openPopup();
    }

    /* =================================================================
       9. POPUP 1 — MARKER POPUP HO 4 MODU
       ================================================================= */
    function buildPopupHTML(place, destLatLng, routeInfo) {
        const cfg = getTipoConfig(place.type);
        const image = place.images && place.images[0] && place.images[0].url
            ? place.images[0].url
            : (place.image_url || null);

        const imgHTML = image
            ? '<img src="' + image + '" class="tl-popup__img" alt="' + (place.name || "") + '">'
            : '<div class="tl-popup__img tl-popup__img--empty"><i class="fas fa-camera"></i></div>';

        const muni = place.municipality || "Timor-Leste";
        const village = place.village || "";
        const subTitle = village ? muni + " › " + village : muni;

        let headerTimeHTML = "";
        if (routeInfo && routeInfo.totalSeconds) {
            const times = routeInfo.times;
            const carTime = times ? times.car.text : formatDuration(routeInfo.totalSeconds);
            headerTimeHTML =
                '<span class="tl-popup__header-time" title="Kareta">' +
                    '<i class="fas fa-car"></i> ' + carTime +
                '</span>';
        }

        let statsHTML = "";
        if (currentPosition && Number.isFinite(place.latitude)) {
            const straightMeters = haversineMeters(
                currentPosition.lat, currentPosition.lng,
                place.latitude, place.longitude
            );

            if (routeInfo && routeInfo.roadMeters) {
                statsHTML =
                    '<div class="tl-popup__stats">' +
                        '<div class="tl-popup__stat tl-popup__stat--distance">' +
                            '<div class="tl-popup__stat-label"><i class="fas fa-road"></i> Distánsia</div>' +
                            '<div class="tl-popup__stat-value">' + formatDistance(routeInfo.roadMeters) + '</div>' +
                        '</div>' +
                        '<div class="tl-popup__stat tl-popup__stat--time">' +
                            '<div class="tl-popup__stat-label"><i class="fas fa-car"></i> Kareta</div>' +
                            '<div class="tl-popup__stat-value">' + formatDuration(routeInfo.totalSeconds) + '</div>' +
                        '</div>' +
                    '</div>';
            } else {
                statsHTML =
                    '<div class="tl-popup__stats">' +
                        '<div class="tl-popup__stat tl-popup__stat--distance">' +
                            '<div class="tl-popup__stat-label"><i class="fas fa-location-dot"></i> Husi ita</div>' +
                            '<div class="tl-popup__stat-value">' + formatDistance(straightMeters) + '</div>' +
                        '</div>' +
                        '<div class="tl-popup__stat tl-popup__stat--time">' +
                            '<div class="tl-popup__stat-label"><i class="fas fa-clock"></i> Tempu</div>' +
                            '<div class="tl-popup__stat-value--loading"><i class="fas fa-spinner fa-spin"></i> Kalkula...</div>' +
                        '</div>' +
                    '</div>';
            }
        }

        let travelModesHTML = "";
        if (routeInfo && routeInfo.roadMeters) {
            const times = routeInfo.times || estimateTravelTimes(routeInfo.roadMeters);
            if (times) {
                travelModesHTML =
                    '<div class="tl-popup__travel-modes">' +
                        '<div class="tl-popup__travel-title"><i class="fas fa-route"></i> Tempu tuir modu</div>' +
                        '<div class="tl-popup__travel-grid">' +
                            Object.keys(TRAVEL_MODES).map(function (key) {
                                const mode = TRAVEL_MODES[key];
                                const t = times[key];
                                return '<div class="tl-popup__travel-item">' +
                                           '<div class="tl-popup__travel-icon" style="background:' + mode.color + ';">' +
                                               '<i class="fas ' + mode.icon + '"></i>' +
                                           '</div>' +
                                           '<div class="tl-popup__travel-text">' +
                                               '<div class="tl-popup__travel-label">' + mode.label + '</div>' +
                                               '<div class="tl-popup__travel-time">' + t.text + '</div>' +
                                           '</div>' +
                                       '</div>';
                            }).join("") +
                        '</div>' +
                    '</div>';
            }
        }

        let overlayHTML = "";
        if (routeInfo && routeInfo.totalSeconds) {
            overlayHTML =
                '<div class="tl-popup__img-overlay">' +
                    '<i class="fas fa-car"></i> ' + formatDuration(routeInfo.totalSeconds) +
                '</div>';
        }

        const desc = place.observation || place.description || "";
        const descHTML = desc ? '<p class="tl-popup__desc">' + desc + '</p>' : '';
        const safeName = escapeQuotes(place.name);
        const detailUrl = "/mapa/" + place.id + "/";

        return '' +
            '<div class="tl-popup">' +
                '<div class="tl-popup__header">' +
                    '<div class="tl-popup__header-icon"><i class="fas ' + cfg.icon + '"></i></div>' +
                    '<div class="tl-popup__header-text">' +
                        '<h4 class="tl-popup__header-title">' + (place.name || "Sem naran") + '</h4>' +
                        '<div class="tl-popup__header-sub">' + (place.type || "Turizmu") + '</div>' +
                    '</div>' +
                    headerTimeHTML +
                '</div>' +
                '<div class="tl-popup__body">' +
                    statsHTML +
                    '<div class="tl-popup__loc"><i class="fas fa-map-marker-alt"></i> ' + subTitle + '</div>' +
                    descHTML +
                    travelModesHTML +
                    '<div class="tl-popup__img-wrap">' + imgHTML + overlayHTML + '</div>' +
                    '<button type="button" class="tl-popup__btn-route-full" ' +
                        'onclick="window.tlStartRoute(' + place.latitude + ',' + place.longitude + ',\'' + safeName + '\')">' +
                        '<i class="fas fa-route"></i> Rota ba ne\'e' +
                    '</button>' +
                    '<a class="tl-popup__btn-detail-link" href="' + detailUrl + '">Haree detallu kompletu →</a>' +
                '</div>' +
            '</div>';
    }

    /* =================================================================
       10. DETEKTA LOKALIZASAUN
       ================================================================= */
    function locateMe() {
        if (!navigator.geolocation) { alert("Browser la suporta GPS."); return; }

        navigator.geolocation.getCurrentPosition(
            function (position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;

                currentPosition = L.latLng(lat, lng);
                window.userLatLng = currentPosition;

                if (currentMarker)  map.removeLayer(currentMarker);
                if (accuracyCircle) map.removeLayer(accuracyCircle);

                currentMarker = L.marker(currentPosition, {
                    icon: L.divIcon({
                        className: "user-dot",
                        html: '<div style="width:16px;height:16px;' +
                              'background:#0d6efd;border:3px solid #fff;' +
                              'border-radius:50%;box-shadow:0 0 6px #0d6efd;"></div>',
                        iconSize: [16, 16], iconAnchor: [8, 8],
                    }),
                }).addTo(map).bindPopup("Ita-nia lokalizasaun atual");

                accuracyCircle = L.circle(currentPosition, {
                    radius: accuracy, color: "#0d6efd",
                    fillColor: "#0d6efd", fillOpacity: 0.10, weight: 1,
                }).addTo(map);

                map.setView(currentPosition, 13);
                currentMarker.openPopup();
                updateDistancesFromUser();
            },
            function (error) {
                let msg = "La konsege hetan lokalizasaun.";
                if (error.code === 1) msg = "Permisaun GPS rejeita.";
                else if (error.code === 2) msg = "Lokalizasaun la disponivel.";
                else if (error.code === 3) msg = "GPS timeout.";
                alert(msg);
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
    }

    if (gpsBtn) gpsBtn.addEventListener("click", locateMe);

    /* =================================================================
       11. UPDATE DISTÁNSIA HOTU
       ================================================================= */
    function updateDistancesFromUser() {
        if (!currentPosition) return;

        allPlaces.forEach(function (place) {
            place._meters = haversineMeters(
                currentPosition.lat, currentPosition.lng,
                place.latitude, place.longitude
            );
        });

        const sorted = allPlaces.slice()
            .filter(function (p) { return Number.isFinite(p._meters); })
            .sort(function (a, b) { return a._meters - b._meters; });

        renderNearestList(sorted);

        Object.keys(placeMarkers).forEach(function (id) {
            const place = allPlaces.find(function (p) { return String(p.id) === String(id); });
            const marker = placeMarkers[id];
            if (place && marker) {
                marker.setPopupContent(buildPopupHTML(place, marker.getLatLng(), null));
            }
        });
    }

    /* =================================================================
       12. RENDER LISTA NEAREST
       ================================================================= */
    function renderNearestList(sortedPlaces) {
        if (!nearestList) return;
        nearestList.innerHTML = "";

        if (!sortedPlaces.length) {
            nearestList.innerHTML = '<div class="p-3 text-muted small text-center">La iha dadus.</div>';
            return;
        }

        sortedPlaces.slice(0, 10).forEach(function (place, index) {
            const cfg = getTipoConfig(place.type);
            const item = document.createElement("div");
            item.className = "nearest-item";
            item.dataset.placeId = place.id;
            item.style.cursor = "pointer";

            const rankBadge = index === 0
                ? '<span class="badge bg-warning text-dark me-2" style="font-size:10px;">1º</span>'
                : '<span class="badge bg-secondary me-2" style="font-size:10px;">' + (index + 1) + 'º</span>';

            item.innerHTML =
                '<div class="d-flex align-items-center gap-2">' +
                    rankBadge +
                    '<span class="nearest-dot" style="background:' + cfg.color + ';"><i class="fas ' + cfg.icon + '"></i></span>' +
                    '<div class="flex-grow-1 min-w-0">' +
                        '<div class="nearest-name text-truncate">' + (place.name || "-") + '</div>' +
                        '<div class="nearest-meta text-truncate">' + (place.type || "") + '</div>' +
                    '</div>' +
                    '<div class="nearest-distance">' + formatDistance(place._meters) + '</div>' +
                '</div>';

            item.addEventListener("click", function (e) {
                e.preventDefault(); e.stopPropagation();
                document.querySelectorAll(".nearest-item").forEach(function (el) { el.classList.remove("active"); });
                item.classList.add("active");
                openPlaceWithRoute(place);
            });

            nearestList.appendChild(item);
        });

        if (nearestPanel) nearestPanel.classList.add("show");
    }

    /* =================================================================
       13. OPEN PLACE WITH ROUTE
       ================================================================= */
    function openPlaceWithRoute(place) {
        const marker = placeMarkers[place.id];
        if (!marker) return;

        const destLatLng = marker.getLatLng();
        map.setView(destLatLng, 15);
        marker.setPopupContent(buildPopupHTML(place, destLatLng, null));
        safeOpenPopup(marker); // ⬅️ Uza safe open

        if (!currentPosition) return;
        calculateRouteForPlace(place, destLatLng);
    }

    /* =================================================================
       14. CALCULATE ROUTE FOR PLACE
       ================================================================= */
    function calculateRouteForPlace(place, destLatLng) {
        if (!L.Routing || !currentPosition) return;

        if (routeControl) { map.removeControl(routeControl); routeControl = null; }

        if (infoDest)     infoDest.textContent = place.name;
        if (infoStraight) infoStraight.textContent = formatDistance(haversineMeters(
            currentPosition.lat, currentPosition.lng, destLatLng.lat, destLatLng.lng
        ));
        if (infoRoad) infoRoad.textContent = "Kalkula...";
        if (infoTime) infoTime.textContent = "Kalkula...";

        const marker = placeMarkers[place.id];
        if (marker) {
            marker.setPopupContent(buildPopupHTML(place, destLatLng, null));
            safeOpenPopup(marker);
        }

        routeControl = L.Routing.control({
            waypoints: [currentPosition, destLatLng],
            routeWhileDragging: false, addWaypoints: false, draggableWaypoints: false,
            showAlternatives: false, fitSelectedRoutes: false, show: false,
            lineOptions: { styles: [{ color: "#0d6efd", opacity: 0.9, weight: 6 }] },
            createMarker: function () { return null; },
            router: L.Routing.osrmv1({ serviceUrl: "https://router.project-osrm.org/route/v1" }),
        }).addTo(map);

        routeControl.on("routingstart", function () {
            setTimeout(function () {
                if (marker && !marker.isPopupOpen()) safeOpenPopup(marker);
            }, 50);
        });

        routeControl.on("routesfound", function (event) {
            if (!event.routes || !event.routes.length) return;
            const s = event.routes[0].summary;
            const roadMeters = s.totalDistance;
            const totalSeconds = s.totalTime;
            const times = estimateTravelTimes(roadMeters);

            if (infoRoad) infoRoad.textContent = formatDistance(roadMeters);
            if (infoTime) infoTime.textContent = formatDuration(totalSeconds);
            if (routePanel) routePanel.classList.add("show");
            if (clearRouteBtn) clearRouteBtn.style.display = "flex";

            if (marker) {
                marker.setPopupContent(buildPopupHTML(place, destLatLng, {
                    roadMeters: roadMeters, totalSeconds: totalSeconds, times: times,
                }));
                safeOpenPopup(marker); // ⬅️ Uza safe open
            }
        });

        routeControl.on("routingerror", function () {
            if (infoRoad) infoRoad.textContent = "--";
            if (infoTime) infoTime.textContent = "--";
            if (marker) {
                marker.setPopupContent(
                    '<div class="tl-popup"><div class="tl-popup__body">' +
                        '<h3 class="tl-popup__place-title">' + (place.name || "-") + '</h3>' +
                        '<div class="tl-popup__loc text-danger"><i class="fas fa-exclamation-triangle"></i> Rota la hetan.</div>' +
                    '</div></div>'
                );
                safeOpenPopup(marker);
            }
        });
    }

    /* =================================================================
       15. BOTÃO NEAREST
       ================================================================= */
    if (nearestBtn) {
        nearestBtn.addEventListener("click", function () {
            if (!currentPosition) { alert("Klik \"GPS Hau\" uluk."); return; }
            const withDist = allPlaces.filter(function (p) { return Number.isFinite(p._meters); });
            if (!withDist.length) { alert("La iha fatin ho koordenada válidu."); return; }

            withDist.sort(function (a, b) { return a._meters - b._meters; });
            renderNearestList(withDist);
            openPlaceWithRoute(withDist[0]);

            setTimeout(function () {
                const firstItem = document.querySelector(".nearest-item");
                if (firstItem) firstItem.classList.add("active");
            }, 100);
        });
    }

    /* =================================================================
       16. SHOW ROUTE / HAMÓS ROTA
       ================================================================= */
    function showRoute(destination, placeName) {
        if (!currentPosition) { alert("Klik uluk \"GPS Hau\"."); return; }
        if (!L.Routing) { alert("Plugin rota la disponivel."); return; }
        const place = allPlaces.find(function (p) {
            return p.name === placeName ||
                   (Math.abs(p.latitude - destination.lat) < 0.0001 && Math.abs(p.longitude - destination.lng) < 0.0001);
        });
        if (place) calculateRouteForPlace(place, destination);
    }

    window.tlStartRoute = function (destLat, destLng, destName) {
        const place = allPlaces.find(function (p) {
            return Math.abs(p.latitude - destLat) < 0.0001 && Math.abs(p.longitude - destLng) < 0.0001;
        });
        if (place) calculateRouteForPlace(place, L.latLng(destLat, destLng));
        else showRoute(L.latLng(destLat, destLng), destName);
    };

    function clearRoute() {
        if (routeControl) { map.removeControl(routeControl); routeControl = null; }
        if (destinationMarker) { map.removeLayer(destinationMarker); destinationMarker = null; }
        if (infoDest) infoDest.textContent = "--";
        if (infoStraight) infoStraight.textContent = "--";
        if (infoRoad) infoRoad.textContent = "--";
        if (infoTime) infoTime.textContent = "--";
        if (routePanel) routePanel.classList.remove("show");
        if (clearRouteBtn) clearRouteBtn.style.display = "none";
    }

    if (clearRouteBtn) clearRouteBtn.addEventListener("click", clearRoute);
    if (closeRoutePanel) closeRoutePanel.addEventListener("click", function () { if (routePanel) routePanel.classList.remove("show"); });
    if (closeNearestBtn) closeNearestBtn.addEventListener("click", function () { if (nearestPanel) nearestPanel.classList.remove("show"); });

    /* =================================================================
       17. FULLSCREEN
       ================================================================= */
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener("click", function () {
            const container = document.getElementById("map-container");
            if (!container) return;
            if (!document.fullscreenElement) {
                (container.requestFullscreen || container.webkitRequestFullscreen).call(container);
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            } else {
                (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            }
            setTimeout(function () { map.invalidateSize(); }, 300);
        });
    }

    /* =================================================================
       18. FILTRU
       ================================================================= */
    function applyFilter(tipo) {
        activeFilter = tipo;
        let visibleCount = 0;

        Object.keys(placeMarkers).forEach(function (id) {
            const place = allPlaces.find(function (p) { return String(p.id) === String(id); });
            if (!place) return;
            const marker = placeMarkers[id];
            const placeType = normalizeType(place.type);
            const show = tipo === "all" || placeType === normalizeType(tipo) || placeType.indexOf(normalizeType(tipo)) !== -1;

            if (show) {
                if (!markerCluster.hasLayer(marker)) markerCluster.addLayer(marker);
                visibleCount++;
            } else {
                if (markerCluster.hasLayer(marker)) markerCluster.removeLayer(marker);
            }
        });
        updateVisibleCount(visibleCount, tipo !== "all");
    }

    filterItems.forEach(function (item) {
        item.addEventListener("click", function () {
            filterItems.forEach(function (i) { i.classList.remove("active"); });
            item.classList.add("active");
            applyFilter(item.dataset.tipo || "all");
        });
    });

    if (resetBtn) {
        resetBtn.addEventListener("click", function () {
            filterItems.forEach(function (i) { i.classList.remove("active"); });
            const allItem = document.querySelector('.filter-item[data-tipo="all"]');
            if (allItem) allItem.classList.add("active");
            applyFilter("all");
            map.setView([-9.0, 125.8], 10);
            clearRoute();
        });
    }

    /* =================================================================
       19. KARREGA DADUS HUSI API
       ================================================================= */
    fetch(API_URL, { headers: { "Accept": "application/json" } })
        .then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status);
            return response.json();
        })
        .then(function (data) {
            if (!Array.isArray(data.places)) throw new Error("Formatu API la válidu.");

            allPlaces = [];
            const bounds = [];

            data.places.forEach(function (place) {
                const lat = Number(place.latitude);
                const lng = Number(place.longitude);

                if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

                place.latitude  = lat;
                place.longitude = lng;
                allPlaces.push(place);

                const destLatLng = L.latLng(lat, lng);
                const marker = L.marker(destLatLng, { icon: makeTipoIcon(place.type) });

                // ⭐ AUTO PAN PADDING — labele taka kontrolu
                marker.bindPopup(buildPopupHTML(place, destLatLng, null), {
                    maxWidth: 280,
                    className: "tl-popup-wrap",
                    autoPan: true,
                    autoPanPaddingTopLeft:     L.point(40, 140),
                    autoPanPaddingBottomRight: L.point(40, 80),
                });

                markerCluster.addLayer(marker);
                placeMarkers[place.id] = marker;
                bounds.push(destLatLng);
            });

            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
                updateVisibleCount(allPlaces.length, false);
            } else {
                updateVisibleCount(0, false);
            }
        })
        .catch(function (error) {
            console.error("Erru API:", error);
            if (mapCountText) mapCountText.textContent = "0 fatin";
            alert("La konsege karrega dadus turizmu. Verifika URL API no internet.");
        });

    /* =================================================================
       20. RESIZE & EXPOSE GLOBAL
       ================================================================= */
    setTimeout(function () { map.invalidateSize(); }, 300);
    window.addEventListener("resize", function () {
        setTimeout(function () { map.invalidateSize(); }, 200);
    });

    window.tlMap           = map;
    window.tlMarkerCluster = markerCluster;
    window.tlPlaces        = function () { return allPlaces; };
});