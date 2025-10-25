from django.urls import re_path
from .consumers import InternshipConsumer

websocket_urlpatterns = [
    re_path(r'internship/(?P<internship_id>\w+)/$', InternshipConsumer.as_asgi()),
]
