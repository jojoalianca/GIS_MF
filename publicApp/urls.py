from django.urls import path
from django.views.generic import TemplateView
from .views import *

urlpatterns = [
	path('', mapa_view, name="mapa_view"),
    path('api/map-points/', map_points_api, name='map_points_api'),
    path('mapa/detalhe/<int:pk>/', mapa_detail_view,name='mapa_detail'),
    path('api/turismu-points/', turismu_points_api,name='turismu_points_api'),


	]