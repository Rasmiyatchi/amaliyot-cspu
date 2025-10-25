# Amaliyot Platformasi

Talabalar amaliyotini boshqarish uchun to'liq platforma.

## Xususiyatlar

- **Talabalar boshqaruvi**: Talabalar ro'yxati, ma'lumotlari, amaliyot tayinlash
- **Rahbarlar boshqaruvi**: Rahbarlar ro'yxati, sig'im boshqaruvi
- **Korxonalar boshqaruvi**: Korxonalar ro'yxati, sig'im boshqaruvi
- **Amaliyot boshqaruvi**: Kunlik status, hisobotlar, baholash
- **Dashboard**: Har bir rol uchun maxsus statistika
- **Real-time yangilanishlar**: WebSocket orqali
- **API dokumentatsiya**: Swagger va ReDoc
- **Hujjat yuklash**: Fayllar bilan ishlash

## Texnologiyalar

### Backend
- Django 5.2.6
- Django REST Framework
- PostgreSQL/SQLite
- WebSocket (Channels)
- Swagger/ReDoc

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite

## O'rnatish

### Development

1. Repository ni clone qiling:
```bash
git clone https://github.com/yourusername/amaliyot_platform.git
cd amaliyot_platform
```

2. Backend o'rnatish:
```bash
cd backend
pip install -r requirements.txt
cp env.example .env
# .env faylini sozlang
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

3. Frontend o'rnatish:
```bash
cd frontend
npm install
cp env.example .env
# .env faylini sozlang
npm run dev
```

### Production Deploy

**Backend (PythonAnywhere):**
1. `PYTHONANYWHERE_DEPLOY.md` faylini o'qing
2. `deploy_pythonanywhere.sh` scriptini ishga tushiring

**Frontend (Vercel):**
1. `FRONTEND_DEPLOY_GUIDE.md` faylini o'qing
2. GitHub ga push qiling
3. Vercel ga connect qiling
4. Deploy tugmasini bosing
5. URL: `https://amaliyot.vercel.app`

## API Endpoints

- **Swagger UI**: `/swagger/`
- **ReDoc**: `/redoc/`
- **API Base**: `/api/`

Barcha endpointlar uchun to'liq dokumentatsiya: `API_DOCUMENTATION.md`

## Rollar

- **Super Admin**: Barcha ma'lumotlarga to'liq ruxsat
- **Admin**: Admin funksiyalari
- **Supervisor**: O'z talabalari va amaliyotlari
- **Student**: O'z ma'lumotlari va amaliyoti

## Environment Variables

```env
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_ENGINE=django.db.backends.sqlite3
DATABASE_NAME=db.sqlite3
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## Contributing

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/amazing-feature`)
3. O'zgarishlarni commit qiling (`git commit -m 'Add amazing feature'`)
4. Branch ga push qiling (`git push origin feature/amazing-feature`)
5. Pull Request yarating

## License

MIT License - batafsil ma'lumot uchun `LICENSE` faylini ko'ring.

## Support

Savollar uchun: admin@amaliyot.uz
