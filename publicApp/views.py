from django.shortcuts import render,redirect,get_object_or_404
from django.views.generic import ListView, DetailView
from django.shortcuts import render as filtering
from django.db.models import Sum, Count, Prefetch,Q
from django.shortcuts import render,redirect
from GISAPP.models import *
from django.http import JsonResponse
from django.db.models import Count
from django.core.serializers import serialize
from django.http import JsonResponse
from GISAPP.models import Point
from django.views.decorators.http import require_GET

from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.db.models import Count, Q, Prefetch
from django.views.decorators.http import require_GET
from django.views.generic import DetailView

from GISAPP.models import Mapa, Point, PointImage


def mapa_view(request):
    tipos = Mapa.objects.values('tipo').annotate(
        count=Count('id')).order_by('tipo')

    tipo_colors = {
        'Turismo Relijiozu': '#FF6B6B',
        'Turismu Kultural':  '#4ECDC4',
        'Turismu Natural':   '#45B7D1',
        'Turismu Istoriku':  '#96CEB4',
        'Turismu Eventura':  '#FFEAA7',
        'Turismu Ekologiku': '#55EFC4',
    }

    tipo_list = [{
        'tipo': t['tipo'],
        'count': t['count'],
        'color': tipo_colors.get(t['tipo'], '#666666'),
    } for t in tipos]

    mapas = (Mapa.objects
             .select_related('municipality', 'administrativepost',
                             'village', 'aldeia')
             .prefetch_related(
                 Prefetch('Location',
                          queryset=Point.objects.prefetch_related('images'))
             ).all())

    for mapa in mapas:
        images_list, total = [], 0
        for point in mapa.Location.all():
            for img in point.images.all():
                images_list.append({
                    'url': img.image.url,
                    'description': img.description or '',
                })
                total += 1
        mapa.all_images = images_list[:5]
        mapa.total_images = total
        mapa.points_count = mapa.Location.count()

    points = (Point.objects
              .select_related('Maps__municipality', 'Maps__administrativepost',
                              'Maps__village', 'Maps__aldeia')
              .prefetch_related('images').all())

    return render(request, 'mapaublic.html', {
        'tipo_list': tipo_list,
        'mapas': mapas,
        'points': points,
    })


@require_GET
def turismu_points_api(request):
    points = (Point.objects
              .select_related('Maps', 'Maps__municipality')
              .prefetch_related('images'))

    places = []
    for point in points:
        # Valida koordenada
        try:
            latitude  = float(point.latitude)
            longitude = float(point.longitude)
        except (TypeError, ValueError):
            continue

        if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
            continue

        mapa = point.Maps
        images = [{
            "url": foto.image.url,
            "description": foto.description or "",
        } for foto in point.images.all() if foto.image]

        places.append({
            "id": point.id,
            "name": mapa.naran,
            "type": mapa.tipo.strip(),
            "latitude": latitude,
            "longitude": longitude,
            "observation": mapa.Obs or "",
            "municipality": str(mapa.municipality) if mapa.municipality else "",
            "images": images,
        })

    return JsonResponse({"places": places, "total": len(places)})


def map_points_api(request):
    points = Point.objects.select_related(
        'Maps__municipality',
        'Maps__administrativepost',
        'Maps__village',
        'Maps__aldeia'
    ).prefetch_related('images').all()
    
    data = []
    for point in points:
        photos = []
        for image in point.images.all():
            if image.image:
                photos.append({
                    'url': request.build_absolute_uri(image.image.url),
                    'description': image.description
                })
        
        maps = point.Maps
        data.append({
            'naran': maps.naran,
            'tipo': maps.tipo,
            'obs': maps.Obs,
            'municipality': maps.municipality.name if maps.municipality else None,
            'administrativepost': maps.administrativepost.name if maps.administrativepost else None,
            'village': maps.village.name if maps.village else None,
            'aldeia': maps.aldeia.name if maps.aldeia else None,
            'data_registu': maps.data_registu.strftime('%d/%m/%Y'),
            'latitude': point.latitude,
            'longitude': point.longitude,
            'photos': photos
        })
    
    return JsonResponse(data, safe=False)



def mapa_detail_view(request, pk):
    """Pájina detallu ba fatin turizmu ida."""
    mapa = get_object_or_404(
        Mapa.objects.select_related(
            'municipality', 'administrativepost', 'village', 'aldeia'
        ).prefetch_related('Location__images'),
        pk=pk
    )

    # Foti point dahuluk (ba koordenada no mapa)
    points = list(mapa.Location.all())
    first_point = points[0] if points else None

    # Foti imajen hotu husi point hotu
    all_images = []
    for p in points:
        for img in p.images.all():
            all_images.append({
                'url': img.image.url,
                'description': img.description or '',
            })

    # Fatin seluk iha munisípiu hanesan ka tipu hanesan (relasionadu)
    related = (Mapa.objects
               .filter(Q(municipality=mapa.municipality) |
                       Q(tipo=mapa.tipo))
               .exclude(pk=mapa.pk)
               .select_related('municipality', 'village')
               .prefetch_related('Location__images')[:6])

    # Prepara imajen primeiru ba kada relasionadu
    for r in related:
        r.first_image = None
        for p in r.Location.all():
            imgs = list(p.images.all())
            if imgs:
                r.first_image = imgs[0].image.url
                break

    context = {
        'mapa': mapa,
        'points': points,
        'first_point': first_point,
        'all_images': all_images,
        'related': related,
    }
    return render(request, 'mapa/detailPublic.html', context)