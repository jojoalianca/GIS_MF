# mapa/forms.py
from django import forms
from .models import Mapa, Point, PointImage

class MapaForm(forms.ModelForm):
    class Meta:
        model = Mapa
        fields = ['naran', 'tipo', 'Obs', 'municipality', 'administrativepost', 'village', 'aldeia']
        widgets = {
            'Obs': forms.Textarea(attrs={'rows': 4}),
            'naran': forms.TextInput(attrs={'class': 'form-control'}),
            'tipo': forms.Select(attrs={'class': 'form-control'}),
        }
    
    def clean_naran(self):
        naran = self.cleaned_data.get('naran')
        if Mapa.objects.filter(naran=naran).exists():
            if self.instance and self.instance.pk:
                # Verificar se é atualização do mesmo objeto
                if Mapa.objects.filter(naran=naran).exclude(pk=self.instance.pk).exists():
                    raise forms.ValidationError('Naran mapa ida ne\'e ona iha sistema.')
            else:
                # É criação nova
                raise forms.ValidationError('Naran mapa ida ne\'e ona iha sistema.')
        return naran


class PointForm(forms.ModelForm):
    images = forms.FileField(
        widget=forms.ClearableFileInput(attrs={'multiple': True}),
        required=False,
        label='Upload Fotos'
    )
    
    class Meta:
        model = Point
        fields = ['Maps', 'latitude', 'longitude']
        widgets = {
            'Maps': forms.Select(attrs={'class': 'form-control'}),
            'latitude': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: -8.5585'}),
            'longitude': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Ex: 125.5785'}),
        }
    
    def clean(self):
        cleaned_data = super().clean()
        latitude = cleaned_data.get('latitude')
        longitude = cleaned_data.get('longitude')
        mapa = cleaned_data.get('Maps')
        
        if latitude and longitude and mapa:
            # Verificar se coordenadas já existem
            qs = Point.objects.filter(Maps=mapa, latitude=latitude, longitude=longitude)
            if self.instance and self.instance.pk:
                qs = qs.exclude(pk=self.instance.pk)
            
            if qs.exists():
                raise forms.ValidationError('Koordenada ida ne\'e ona iha mapa ne\'e.')
        
        return cleaned_data


class PointImageForm(forms.ModelForm):
    class Meta:
        model = PointImage
        fields = ['image', 'description']
        widgets = {
            'description': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Deskrisaun foto...'}),
        }