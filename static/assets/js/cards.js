// ============================================================
//  CARDS - FACEBOOK STYLE
// ============================================================
import { filterMarkersByType, TIMOR_BOUNDS } from './map.js';

export function initCards() {
    // Initialize Swiper
    document.querySelectorAll('.horizontal-slideshow').forEach(function(el) {
        new Swiper(el, {
            direction: 'horizontal',
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
            spaceBetween: 0,
            slidesPerView: 1,
            speed: 600,
            effect: 'slide',
            grabCursor: true
        });
    });

    // View Map buttons
    document.querySelectorAll('.view-map').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const tipo = this.dataset.tipo;
            
            document.querySelectorAll('.filter-item').forEach(el => el.classList.remove('active'));
            const filterItem = document.querySelector(`.filter-item[data-tipo="${tipo}"]`);
            if (filterItem) filterItem.classList.add('active');
            else document.querySelector('.filter-item[data-tipo="all"]').classList.add('active');
            
            filterMarkersByType(tipo);
            document.getElementById('mapa-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // View Details buttons
    document.querySelectorAll('.view-details').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const mapaId = this.dataset.mapaId;
            window.location.href = `/mapa/detalhe/${mapaId}/`;
        });
    });
}