# mapa/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Dashboard
    path('dashboard/', views.mapa_dashboard, name='mapa-dashboard'),
    
    # Mapa CRUD
    path('', views.mapa_list, name='mapa-list'),
    path('create/', views.mapa_create, name='mapa-create'),
    path('Detallu/mapa/<int:pk>/', views.mapa_detail, name='mapa-detail'),
    path('<int:pk>/update/', views.mapa_update, name='mapa-update'),
    path('<int:pk>/delete/', views.mapa_delete, name='mapa-delete'),
    
    # Point CRUD
    path('point/create/', views.point_create, name='point-create'),
    path('point/<int:pk>/update/', views.point_update, name='point-update'),
    path('point/<int:pk>/delete/', views.point_delete, name='point-delete'),
    path('point/image/<int:pk>/delete/', views.point_image_delete, name='point-image-delete'),
    
    # AJAX URLs
    path('ajax/load-administrativeposts/', views.load_administrativeposts, name='load_administrativeposts'),
    path('ajax/load-villages/', views.load_villages, name='load_villages'),
    path('ajax/load-aldeias/', views.load_aldeias, name='load_aldeias'),
    path('ajax/check-name/', views.check_map_name, name='check-map-name'),
    
 
    # API URLs
    path('<int:mapa_id>/data/', views.get_map_data, name='mapa-data'),
    
    # Export URLs
    path('export/json/', views.export_mapas_json, name='export-mapas-json'),
    path('export/csv/', views.export_mapas_csv, name='export-mapas-csv'),

]