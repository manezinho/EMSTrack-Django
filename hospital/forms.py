from django import forms
from django.contrib.gis.forms import PointField
from django.utils.translation import ugettext_lazy as _

from emstrack.forms import LeafletPointWidget

from .models import Hospital


class HospitalCreateForm(forms.ModelForm):
    location = PointField(
        label=_('Location'),
        widget=LeafletPointWidget(attrs={'map_width': 500,
                                         'map_height': 300})
    )

    class Meta:
        model = Hospital
        fields = ['name',
                  'number', 'street', 'unit', 'neighborhood',
                  'city', 'state', 'zipcode', 'country',
                  'active',
                  'comment',
                  'location']


class HospitalUpdateForm(HospitalCreateForm):
    pass

