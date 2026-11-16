# mapa/views.py
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.urls import reverse
from django.db.models import Q, Prefetch
from django.views.decorators.http import require_http_methods
from django.db import transaction

from .models import Mapa, Point, PointImage
from custom.models import Municipality, AdministrativePost, Village, Aldeia

# ==============================================
# Mapa Views (Function-Based)
# ==============================================
@login_required
def mapa_list(request):
    mapas = Mapa.objects.select_related(
        'municipality', 'administrativepost', 'village', 'aldeia'
    ).prefetch_related(
        Prefetch('Location', queryset=Point.objects.prefetch_related('images'))
    ).all()

    # Kalkula total imajen ba kada mapa
    for mapa in mapas:
        mapa.total_images = sum(p.images.count() for p in mapa.Location.all())

    tipos = Mapa.TIPO  # choices
    context = {
        'mapas': mapas,
        'tipos': tipos,
    }
    return render(request, 'mapa/mapa_list.html', context)


@login_required
def mapa_detail(request, pk):
    """Detalhes de um mapa específico"""
    mapa = get_object_or_404(Mapa, pk=pk)
    points = mapa.Location.all().prefetch_related('images')
    
    context = {
        'mapa': mapa,
        'points': points,
    }
    return render(request, 'mapa/mapa_detail.html', context)


@login_required
def mapa_create(request):
    """Cria um novo mapa"""
    if request.method == 'POST':
        try:
            with transaction.atomic():
                # Obter dados do formulário
                naran = request.POST.get('naran')
                tipo = request.POST.get('tipo')
                Obs = request.POST.get('Obs', '')
                municipality_id = request.POST.get('municipality')
                administrativepost_id = request.POST.get('administrativepost')
                village_id = request.POST.get('village')
                aldeia_id = request.POST.get('aldeia')
                
                # Validação básica
                if not naran or not tipo:
                    messages.error(request, 'Naran no tipu obrigatóriu.')
                    return redirect('mapa-create')
                
                # Verificar se nome já existe
                if Mapa.objects.filter(naran=naran).exists():
                    messages.error(request, 'Naran mapa ida ne\'e ona iha sistema.')
                    return redirect('mapa-create')
                
                # Criar mapa
                mapa = Mapa.objects.create(
                    naran=naran,
                    tipo=tipo,
                    Obs=Obs,
                    municipality_id=municipality_id if municipality_id else None,
                    administrativepost_id=administrativepost_id if administrativepost_id else None,
                    village_id=village_id if village_id else None,
                    aldeia_id=aldeia_id if aldeia_id else None,
                )
                
                messages.success(request, f'Mapa "{mapa.naran}" rejistu ho susesu!')
                return redirect('mapa-detail', pk=mapa.pk)
                
        except Exception as e:
            messages.error(request, f'Erru durante kria mapa: {str(e)}')
            return redirect('mapa-create')
    
    # GET request - mostrar formulário
    context = {
        'TIPO': Mapa.TIPO,
        'municipalities': Municipality.objects.all(),
    }
    return render(request, 'mapa/mapa_form.html', context)


@login_required
def mapa_update(request, pk):
    """Atualiza um mapa existente"""
    mapa = get_object_or_404(Mapa, pk=pk)
    
    if request.method == 'POST':
        try:
            with transaction.atomic():
                # Obter dados do formulário
                naran = request.POST.get('naran')
                tipo = request.POST.get('tipo')
                Obs = request.POST.get('Obs', '')
                municipality_id = request.POST.get('municipality')
                administrativepost_id = request.POST.get('administrativepost')
                village_id = request.POST.get('village')
                aldeia_id = request.POST.get('aldeia')
                
                # Validação básica
                if not naran or not tipo:
                    messages.error(request, 'Naran no tipu obrigatóriu.')
                    return redirect('mapa-update', pk=pk)
                
                # Verificar se nome já existe (excluindo o próprio)
                if Mapa.objects.filter(naran=naran).exclude(pk=mapa.pk).exists():
                    messages.error(request, 'Naran mapa ida ne\'e ona iha sistema.')
                    return redirect('mapa-update', pk=pk)
                
                # Atualizar mapa
                mapa.naran = naran
                mapa.tipo = tipo
                mapa.Obs = Obs
                mapa.municipality_id = municipality_id if municipality_id else None
                mapa.administrativepost_id = administrativepost_id if administrativepost_id else None
                mapa.village_id = village_id if village_id else None
                mapa.aldeia_id = aldeia_id if aldeia_id else None
                mapa.save()
                
                messages.success(request, f'Mapa "{mapa.naran}" atualiza ho susesu!')
                return redirect('mapa-detail', pk=mapa.pk)
                
        except Exception as e:
            messages.error(request, f'Erru durante atualiza mapa: {str(e)}')
            return redirect('mapa-update', pk=pk)
    
    # GET request - mostrar formulário com dados existentes
    context = {
        'mapa': mapa,
        'TIPO': Mapa.TIPO,
        'municipalities': Municipality.objects.all(),
    }
    
    # Carregar dados dependentes se existirem
    if mapa.municipality:
        context['administrativeposts'] = AdministrativePost.objects.filter(
            municipality=mapa.municipality
        )
    if mapa.administrativepost:
        context['villages'] = Village.objects.filter(
            administrativepost=mapa.administrativepost
        )
    if mapa.village:
        context['aldeias'] = Aldeia.objects.filter(
            village=mapa.village
        )
    
    return render(request, 'mapa/mapa_form.html', context)


@login_required
@require_http_methods(["POST", "DELETE"])
def mapa_delete(request, pk):
    """Apaga um mapa"""
    mapa = get_object_or_404(Mapa, pk=pk)
    mapa_name = mapa.naran
    
    if request.method == 'POST':
        mapa.delete()
        messages.success(request, f'Mapa "{mapa_name}" apaga ho susesu!')
        return redirect('mapa-list')
    
    if request.method == 'DELETE':
        mapa.delete()
        return JsonResponse({'success': True, 'message': f'Mapa "{mapa_name}" apaga ho susesu!'})


# ==============================================
# Point Views (Function-Based)
# ==============================================

@login_required
def point_create(request):
    """Cria um novo ponto"""
    mapas = Mapa.objects.all()
    
    if request.method == 'POST':
        try:
            with transaction.atomic():
                # Obter dados do formulário
                mapa_id = request.POST.get('Maps')
                latitude = request.POST.get('latitude')
                longitude = request.POST.get('longitude')
                
                # Validação
                if not mapa_id or not latitude or not longitude:
                    messages.error(request, 'Preciza preenche Mapa, Latitude, no Longitude.')
                    return render(request, 'mapa/point_form.html', {'mapas': mapas})
                
                mapa = get_object_or_404(Mapa, pk=mapa_id)
                
                # Verificar duplicação
                if Point.objects.filter(Maps=mapa, latitude=latitude, longitude=longitude).exists():
                    messages.error(request, 'Koordenada ida ne\'e ona iha mapa ne\'e.')
                    return render(request, 'mapa/point_form.html', {'mapas': mapas})
                
                # Criar ponto
                point = Point.objects.create(
                    Maps=mapa,
                    latitude=latitude,
                    longitude=longitude
                )
                
                # Processar imagens (agora o ponto tem PK)
                images = request.FILES.getlist('images')
                for image in images:
                    PointImage.objects.create(
                        point=point,
                        image=image
                    )
                
                messages.success(request, f'Ponto adisiona ho susesu! {len(images)} foto(s) upload.')
                return redirect('mapa-detail', pk=mapa_id)
                
        except Exception as e:
            messages.error(request, f'Erru durante kria ponto: {str(e)}')
            return render(request, 'mapa/point_form.html', {'mapas': mapas})
    
    # GET request
    return render(request, 'mapa/point_form.html', {'mapas': mapas})


@login_required
def point_update(request, pk):
    """Atualiza um ponto existente"""
    point = get_object_or_404(Point, pk=pk)
    mapas = Mapa.objects.all()
    
    if request.method == 'POST':
        try:
            with transaction.atomic():
                # Obter dados do formulário
                mapa_id = request.POST.get('Maps')
                latitude = request.POST.get('latitude')
                longitude = request.POST.get('longitude')
                
                # Validação
                if not mapa_id or not latitude or not longitude:
                    messages.error(request, 'Preciza preenche Mapa, Latitude, no Longitude.')
                    return render(request, 'mapa/point_form.html', {
                        'mapas': mapas,
                        'form': {'instance': point}
                    })
                
                mapa = get_object_or_404(Mapa, pk=mapa_id)
                
                # Verificar duplicação (excluindo o próprio)
                if Point.objects.filter(
                    Maps=mapa, 
                    latitude=latitude, 
                    longitude=longitude
                ).exclude(pk=point.pk).exists():
                    messages.error(request, 'Koordenada ida ne\'e ona iha mapa ne\'e.')
                    return render(request, 'mapa/point_form.html', {
                        'mapas': mapas,
                        'form': {'instance': point}
                    })
                
                # Atualizar ponto
                point.Maps = mapa
                point.latitude = latitude
                point.longitude = longitude
                point.save()
                
                # Processar novas imagens
                images = request.FILES.getlist('images')
                for image in images:
                    PointImage.objects.create(
                        point=point,
                        image=image
                    )
                
                messages.success(request, f'Ponto atualiza ho susesu! {len(images)} foto(s) foun upload.')
                return redirect('mapa-detail', pk=mapa_id)
                
        except Exception as e:
            messages.error(request, f'Erru durante atualiza ponto: {str(e)}')
            return render(request, 'mapa/point_form.html', {
                'mapas': mapas,
                'form': {'instance': point}
            })
    
    # GET request
    return render(request, 'mapa/point_form.html', {
        'mapas': mapas,
        'form': {'instance': point}
    })


@login_required
@require_http_methods(["POST", "DELETE"])
def point_delete(request, pk):
    """Apaga um ponto"""
    point = get_object_or_404(Point, pk=pk)
    mapa_id = point.Maps.pk
    
    if request.method == 'POST':
        point.delete()
        messages.success(request, 'Ponto apaga ho susesu!')
        return redirect('mapa-detail', pk=mapa_id)
    
    if request.method == 'DELETE':
        point.delete()
        return JsonResponse({'success': True, 'message': 'Ponto apaga ho susesu!'})


@login_required
@require_http_methods(["DELETE"])
def point_image_delete(request, pk):
    """Apaga uma imagem de ponto"""
    image = get_object_or_404(PointImage, pk=pk)
    image.delete()
    return JsonResponse({'success': True, 'message': 'Foto apaga ho susesu!'})


# ==============================================
# AJAX Views
# ==============================================

@login_required
def load_administrativeposts(request):
    """Carrega postos administrativos baseados no município"""
    municipality_id = request.GET.get('municipality_id')
    if municipality_id:
        administrativeposts = AdministrativePost.objects.filter(
            municipality_id=municipality_id
        ).order_by('name')
        data = [{'id': ap.id, 'name': ap.name} for ap in administrativeposts]
    else:
        data = []
    return JsonResponse(data, safe=False)


@login_required
def load_villages(request):
    """Carrega sucos baseados no posto administrativo"""
    administrativepost_id = request.GET.get('administrativepost_id')
    if administrativepost_id:
        villages = Village.objects.filter(
            administrativepost_id=administrativepost_id
        ).order_by('name')
        data = [{'id': v.id, 'name': v.name} for v in villages]
    else:
        data = []
    return JsonResponse(data, safe=False)


@login_required
def load_aldeias(request):
    """Carrega aldeias baseadas no suco"""
    village_id = request.GET.get('village_id')
    if village_id:
        aldeias = Aldeia.objects.filter(
            village_id=village_id
        ).order_by('name')
        data = [{'id': a.id, 'name': a.name} for a in aldeias]
    else:
        data = []
    return JsonResponse(data, safe=False)


# ==============================================
# Dashboard View
# ==============================================

@login_required
def mapa_dashboard(request):
    """Dashboard de mapas"""
    from django.db.models import Count
    
    # Estatísticas
    total_mapas = Mapa.objects.count()
    total_points = Point.objects.count()
    total_images = PointImage.objects.count()
    
    # Mapas por tipo
    mapas_por_tipo = []
    for tipo_value, tipo_label in Mapa.TIPO:
        count = Mapa.objects.filter(tipo=tipo_value).count()
        mapas_por_tipo.append({
            'tipo': tipo_label,
            'count': count,
            'percentage': (count / total_mapas * 100) if total_mapas > 0 else 0
        })
    
    # Últimos mapas
    ultimos_mapas = Mapa.objects.order_by('-data_registu')[:5]
    
    # Mapas com mais pontos
    mapas_com_pontos = Mapa.objects.annotate(
        num_points=Count('Location')
    ).order_by('-num_points')[:5]
    
    context = {
        'total_mapas': total_mapas,
        'total_points': total_points,
        'total_images': total_images,
        'mapas_por_tipo': mapas_por_tipo,
        'ultimos_mapas': ultimos_mapas,
        'mapas_com_pontos': mapas_com_pontos,
    }
    
    return render(request, 'mapa/mapa_dashboard.html', context)


# ==============================================
# API Views
# ==============================================

@login_required
def get_map_data(request, mapa_id):
    """Retorna dados do mapa em JSON para API"""
    mapa = get_object_or_404(Mapa, pk=mapa_id)
    
    points_data = []
    for point in mapa.Location.all():
        point_info = {
            'id': point.id,
            'latitude': point.latitude,
            'longitude': point.longitude,
            'popupContent': point.popupContent,
            'images': []
        }
        
        for image in point.images.all():
            point_info['images'].append({
                'url': request.build_absolute_uri(image.image.url),
                'description': image.description
            })
        
        points_data.append(point_info)
    
    return JsonResponse({
        'mapa': {
            'id': mapa.id,
            'naran': mapa.naran,
            'tipo': mapa.get_tipo_display(),
            'municipality': mapa.municipality.name if mapa.municipality else None,
        },
        'points': points_data
    })


# ==============================================
# Verificação de nome único (AJAX)
# ==============================================

@login_required
def check_map_name(request):
    """Verifica se nome do mapa já existe (AJAX)"""
    naran = request.GET.get('naran', '')
    mapa_id = request.GET.get('mapa_id', '')
    
    if not naran:
        return JsonResponse({'exists': False})
    
    qs = Mapa.objects.filter(naran=naran)
    if mapa_id:
        qs = qs.exclude(pk=mapa_id)
    
    exists = qs.exists()
    return JsonResponse({'exists': exists})

@login_required
def export_mapas_json(request):
    mapas = Mapa.objects.prefetch_related('Location__images').all()
    
    data = []
    for mapa in mapas:
        mapa_data = {
            'id': mapa.id,
            'naran': mapa.naran,
            'tipo': mapa.tipo,
            'tipo_display': mapa.get_tipo_display(),
            'Obs': mapa.Obs,
            'municipality': mapa.municipality.name if mapa.municipality else None,
            'administrativepost': mapa.administrativepost.name if mapa.administrativepost else None,
            'village': mapa.village.name if mapa.village else None,
            'aldeia': mapa.aldeia.name if mapa.aldeia else None,
            'data_registu': mapa.data_registu.strftime('%Y-%m-%d'),
            'points': []
        }
        
        for point in mapa.Location.all():
            point_data = {
                'latitude': point.latitude,
                'longitude': point.longitude,
                'images': [
                    {
                        'url': request.build_absolute_uri(img.image.url),
                        'description': img.description
                    } for img in point.images.all()
                ]
            }
            mapa_data['points'].append(point_data)
        
        data.append(mapa_data)
    
    response = JsonResponse(data, safe=False)
    response['Content-Disposition'] = 'attachment; filename="mapas_export.json"'
    return response


@login_required
def export_mapas_csv(request):
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="mapas_export.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['ID', 'Naran', 'Tipu', 'Município', 'Postu Administrativu', 
                     'Suku', 'Aldeia', 'Total Pontos', 'Data Rejistu'])
    
    mapas = Mapa.objects.annotate(total_points=models.Count('Location')).all()
    
    for mapa in mapas:
        writer.writerow([
            mapa.id,
            mapa.naran,
            mapa.get_tipo_display(),
            mapa.municipality.name if mapa.municipality else '',
            mapa.administrativepost.name if mapa.administrativepost else '',
            mapa.village.name if mapa.village else '',
            mapa.aldeia.name if mapa.aldeia else '',
            mapa.total_points,
            mapa.data_registu.strftime('%d/%m/%Y')
        ])
    
    return response