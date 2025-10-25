from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Internship, DailyReport, Document
from datetime import date

channel_layer = get_channel_layer()

@receiver(post_save, sender=Internship)
def internship_updated(sender, instance, created, **kwargs):
    """Send WebSocket update when internship is updated"""
    if channel_layer:
        group_name = f'internship_{instance.id}'
        
        # Amaliyot tugash sanasi kelgan bo'lsa, avtomatik yakunlash
        if instance.status == 'active' and instance.end_date and instance.end_date <= date.today():
            instance.complete_internship()
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'internship_update',
                'data': {
                    'id': instance.id,
                    'status': instance.status,
                    'start_date': instance.start_date.isoformat() if instance.start_date else None,
                    'end_date': instance.end_date.isoformat() if instance.end_date else None,
                    'student_name': f"{instance.student.user.first_name} {instance.student.user.last_name}",
                    'supervisor_name': f"{instance.supervisor.first_name} {instance.supervisor.last_name}",
                    'company_name': instance.company.name if instance.company else None,
                }
            }
        )

@receiver(post_save, sender=DailyReport)
def report_updated(sender, instance, created, **kwargs):
    """Send WebSocket update when daily report is updated"""
    if channel_layer:
        group_name = f'internship_{instance.internship.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'report_update',
                'data': {
                    'id': instance.id,
                    'date': instance.date.isoformat(),
                    'description': instance.activities,
                    'status': instance.status,
                    'created_at': instance.created_at.isoformat(),
                }
            }
        )

@receiver(post_save, sender=Document)
def document_updated(sender, instance, created, **kwargs):
    """Send WebSocket update when document is updated"""
    if channel_layer:
        group_name = f'internship_{instance.internship.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'document_update',
                'data': {
                    'id': instance.id,
                    'title': instance.name,
                    'file_type': instance.type,
                    'created_at': instance.uploaded_at.isoformat(),
                }
            }
        )
