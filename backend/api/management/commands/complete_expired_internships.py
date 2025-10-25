from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from api.models import Internship

class Command(BaseCommand):
    help = 'Amaliyotlarni avtomatik yakunlash'

    def handle(self, *args, **options):
        """Tugash sanasi kelgan amaliyotlarni avtomatik yakunlash"""
        today = date.today()
        
        # Tugash sanasi kelgan faol amaliyotlarni topish
        expired_internships = Internship.objects.filter(
            status='active',
            end_date__lte=today
        )
        
        completed_count = 0
        for internship in expired_internships:
            if internship.complete_internship():
                completed_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Amaliyot yakunlandi: {internship.student.user.get_full_name()} - {internship.company.name if internship.company else "Korxona yoq"}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Jami {completed_count} ta amaliyot yakunlandi'
            )
        )
