
from django.db import models
from custom.models import *

class Mapa(models.Model):
    TIPO= [
        ('Turismo Relijiozu', 'Turismo Relijiozu'),
        ('Turismu Kultural ', 'Turismu Kultural'),
        ('Turismu Natural ', 'Turismu Natural'),
        ('Turismu Istoriku ', 'Turismu Istoriku'),
        ('Turismu Eventura ', 'Turismu Eventura'),
        ('Turismu Ekologiku ', 'Turismu Ekologiku'),
    ]
    naran = models.CharField(max_length=255, unique=True)
    tipo = models.CharField(max_length=50, choices=TIPO)
    Obs = models.CharField(max_length=1500, null=True, blank=True)
    municipality = models.ForeignKey(Municipality, on_delete=models.CASCADE,null=True,blank=True,related_name="MMunicipality")
    administrativepost = models.ForeignKey(AdministrativePost, on_delete=models.CASCADE,null=True,blank=True, related_name="AAdministrativePost")
    village = models.ForeignKey(Village, on_delete=models.CASCADE,null=True,blank=True, related_name="VVillage")
    aldeia = models.ForeignKey(Aldeia, on_delete=models.CASCADE,null=True,blank=True, related_name="AAldeia")
    data_registu = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.naran} - {self.municipality}"

    class Meta:
        ordering = ['naran']

class Point(models.Model):
    Maps = models.ForeignKey(Mapa, on_delete=models.CASCADE, related_name="Location")
    latitude  = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    @property
    def popupContent(self):
        # Kria HTML string atu hatudu kada imagem ho related_name 'images'
        fotos_html = ""
        for foto in self.images.all():
            fotos_html += f'<img src="{foto.image.url}" style="max-width:200px; display:block; margin-bottom:10px;"><br>'
        # Se la iha imagem, hatudu mensagem
        if not fotos_html:
            fotos_html = "<p>La iha foto.</p>"
        return f"<h4>{self.Maps.naran}</h4><p>{self.Maps.tipo}</p>" + fotos_html

class PointImage(models.Model):
    point = models.ForeignKey(Point, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to='Mapa/points/')
    description = models.CharField(max_length=255, blank=True, null=True)