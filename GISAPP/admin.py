# admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.http import urlencode
from .models import Mapa, Point, PointImage

# Admin for PointImage
class PointImageInline(admin.TabularInline):
    model = PointImage
    extra = 1
    readonly_fields = ['thumbnail']
    
    def thumbnail(self, obj):
        if obj.image:
            try:
                return format_html('<img src="{}" width="100" height="75" />', obj.image.url)
            except:
                return "Image Error"
        return "No Image"
    thumbnail.short_description = 'Preview'

# Admin for Point
@admin.register(Point)
class PointAdmin(admin.ModelAdmin):
    list_display = ['id', 'mapa_info', 'latitude', 'longitude', 'image_count_display', 'view_map_link']
    list_filter = ['Maps__tipo', 'Maps__municipality']
    search_fields = ['Maps__naran', 'latitude', 'longitude']
    inlines = [PointImageInline]
    readonly_fields = ['popup_content_preview']
    fieldsets = (
        ('Informasaun Báziku', {
            'fields': ('Maps', 'latitude', 'longitude')
        }),
        ('Preview', {
            'fields': ('popup_content_preview',),
            'classes': ('collapse',)
        }),
    )
    
    def mapa_info(self, obj):
        return f"{obj.Maps.naran} - {obj.Maps.tipo}"
    mapa_info.short_description = 'Mapa'
    mapa_info.admin_order_field = 'Maps__naran'
    
    def image_count_display(self, obj):
        count = obj.images.count()
        # Uza naran app ne'ebé korretu - cheke naran app iha projeto nia INSTALLED_APPS
        # Alternativamente, halo simple
        url = (
            reverse("admin:GISAPP_pointimage_changelist")  # Altera "app" ho naran app nian
            + "?"
            + urlencode({"point__id": f"{obj.id}"})
        )
        return format_html('<a href="{}">{} Imajen</a>', url, count)
    image_count_display.short_description = 'Total Imajen'
    
    def view_map_link(self, obj):
        if obj.latitude and obj.longitude:
            url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
            return format_html('<a href="{}" target="_blank">🌍 Google Maps</a>', url)
        return "-"
    view_map_link.short_description = 'Google Maps'
    
    def popup_content_preview(self, obj):
        return format_html(obj.popupContent)
    popup_content_preview.short_description = 'Popup Preview'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('Maps')

# Inline for Point in Mapa admin
class PointInline(admin.TabularInline):
    model = Point
    extra = 1
    readonly_fields = ['coordinates_display', 'image_count_simple']
    fields = ['coordinates_display', 'image_count_simple']
    
    def coordinates_display(self, obj):
        if obj.latitude and obj.longitude:
            return f"Lat: {obj.latitude}, Lon: {obj.longitude}"
        return "Koordinasaun laiha"
    coordinates_display.short_description = 'Koordinasaun'
    
    def image_count_simple(self, obj):
        return obj.images.count()
    image_count_simple.short_description = 'Imajen'
    
    def has_add_permission(self, request, obj=None):
        return True
    
    def has_change_permission(self, request, obj=None):
        return False

# Admin for Mapa
@admin.register(Mapa)
class MapaAdmin(admin.ModelAdmin):
    list_display = ['naran', 'tipo', 'municipality', 'administrativepost', 
                    'village', 'aldeia', 'data_registu', 'total_points_display']
    list_filter = ['tipo', 'municipality', 'data_registu']
    search_fields = ['naran', 'Obs', 'municipality__name', 
                     'administrativepost__name', 'village__name', 'aldeia__name']
    readonly_fields = ['data_registu']
    inlines = [PointInline]
    list_per_page = 20
    fieldsets = (
        ('Informasaun Báziku', {
            'fields': ('naran', 'tipo', 'Obs', 'data_registu')
        }),
        ('Lokalizasaun', {
            'fields': ('municipality', 'administrativepost', 'village', 'aldeia'),
            'classes': ('collapse',)
        }),
    )
    
    def total_points_display(self, obj):
        count = obj.Location.count()
        # Uza naran app korretu
        url = (
            reverse("admin:GISAPP_point_changelist")  # Altera "app" ho naran app nian
            + "?"
            + urlencode({"Maps__id": f"{obj.id}"})
        )
        return format_html('<a href="{}">{} Ponto</a>', url, count)
    total_points_display.short_description = 'Total Pontu'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'municipality', 'administrativepost', 'village', 'aldeia'
        )

# Admin for PointImage
@admin.register(PointImage)
class PointImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'point_info', 'thumbnail_display', 'description', 'uploaded_at_display']
    list_filter = ['point__Maps__tipo']
    search_fields = ['point__Maps__naran', 'description']
    readonly_fields = ['thumbnail_preview']
    list_per_page = 20
    
    def point_info(self, obj):
        return f"{obj.point.Maps.naran} - {obj.point.Maps.tipo}"
    point_info.short_description = 'Ponto'
    point_info.admin_order_field = 'point__Maps__naran'
    
    def thumbnail_display(self, obj):
        if obj.image:
            try:
                return format_html('<img src="{}" width="100" height="75" />', obj.image.url)
            except:
                return "Error"
        return "No Image"
    thumbnail_display.short_description = 'Imajen'
    
    def thumbnail_preview(self, obj):
        if obj.image:
            try:
                return format_html('<img src="{}" width="300" />', obj.image.url)
            except:
                return "Error loading image"
        return "No Image"
    thumbnail_preview.short_description = 'Preview'
    
    def uploaded_at_display(self, obj):
        # Se la iha uploaded_at field, uza alternativa
        return "N/A"
    uploaded_at_display.short_description = 'Data Upload'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('point__Maps')

# Se ita boot la hatene naran app, bele halo versaun simplifikadu
# Alternativa: Halakon reverse links ne'ebé problema no uza versaun simple: