import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Internship, DailyReport, Document

User = get_user_model()

class InternshipConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.internship_id = self.scope['url_route']['kwargs']['internship_id']
        self.internship_group_name = f'internship_{self.internship_id}'
        
        # Authentication ni vaqtincha o'chirib qo'yamiz
        # user = self.scope['user']
        # if not user.is_authenticated:
        #     await self.close()
        #     return
            
        # # Check if user has permission to access this internship
        # has_access = await self.check_internship_access(user, self.internship_id)
        # if not has_access:
        #     await self.close()
        #     return
        
        # Join internship group
        await self.channel_layer.group_add(
            self.internship_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send current internship data
        internship_data = await self.get_internship_data()
        await self.send(text_data=json.dumps({
            'type': 'internship_data',
            'data': internship_data
        }))

    async def disconnect(self, close_code):
        # Leave internship group
        await self.channel_layer.group_discard(
            self.internship_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.send(text_data=json.dumps({
                    'type': 'pong'
                }))
                
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))

    # Receive message from internship group
    async def internship_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'internship_update',
            'data': event['data']
        }))

    # Receive message from internship group
    async def report_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'report_update',
            'data': event['data']
        }))

    # Receive message from internship group
    async def document_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'document_update',
            'data': event['data']
        }))

    # Receive message from internship group
    async def daily_status_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'daily_status_update',
            'data': event['data']
        }))

    @database_sync_to_async
    def check_internship_access(self, user, internship_id):
        """Check if user has access to this internship"""
        try:
            internship = Internship.objects.get(id=internship_id)
            
            # Student can access their own internship
            if hasattr(user, 'student') and internship.student == user.student:
                return True
                
            # Supervisor can access internships they supervise
            if hasattr(user, 'supervisor') and internship.supervisor == user.supervisor:
                return True
                
            # Company can access internships at their company
            if hasattr(user, 'company') and internship.company == user.company:
                return True
                
            # Admin and super_admin can access all internships
            if user.role == 'admin' or user.role == 'super_admin':
                return True
                
            return False
            
        except Internship.DoesNotExist:
            return False

    @database_sync_to_async
    def get_internship_data(self):
        """Get current internship data"""
        try:
            internship = Internship.objects.get(id=self.internship_id)
            
            # Get recent reports
            recent_reports = DailyReport.objects.filter(
                internship=internship
            ).order_by('-created_at')[:10]
            
            # Get recent documents
            recent_documents = Document.objects.filter(
                internship=internship
            ).order_by('-uploaded_at')[:10]
            
            return {
                'internship': {
                    'id': internship.id,
                    'status': internship.status,
                    'start_date': internship.start_date.isoformat() if internship.start_date else None,
                    'end_date': internship.end_date.isoformat() if internship.end_date else None,
                    'student_name': f"{internship.student.user.first_name} {internship.student.user.last_name}",
                    'supervisor_name': f"{internship.supervisor.first_name} {internship.supervisor.last_name}",
                    'company_name': internship.company.name,
                },
                'recent_reports': [
                    {
                        'id': report.id,
                        'date': report.date.isoformat(),
                        'description': report.activities,
                        'status': report.status,
                        'created_at': report.created_at.isoformat(),
                    }
                    for report in recent_reports
                ],
                'recent_documents': [
                    {
                        'id': doc.id,
                        'title': doc.name,
                        'file_type': doc.type,
                        'created_at': doc.uploaded_at.isoformat(),
                    }
                    for doc in recent_documents
                ]
            }
            
        except Internship.DoesNotExist:
            return None
