# Frontend Deploy uchun Tekin Hosting Tavsiyalari

## 1. **Vercel** (Tavsiya qilinadi) ⭐⭐⭐⭐⭐

**Afzalliklari:**
- GitHub bilan avtomatik deploy
- Tez va ishonchli
- Custom domain qo'llab-quvvatlaydi
- SSL avtomatik
- CDN global

**Deploy qilish:**
1. GitHub ga kodni push qiling
2. Vercel.com ga kiring
3. GitHub bilan connect qiling
4. Repository ni tanlang
5. Deploy tugmasini bosing

**URL:** `https://your-app.vercel.app`

---

## 2. **Netlify** ⭐⭐⭐⭐

**Afzalliklari:**
- GitHub integration
- Form handling
- Serverless functions
- Custom domain

**Deploy qilish:**
1. GitHub ga kodni push qiling
2. Netlify.com ga kiring
3. "New site from Git" tugmasini bosing
4. GitHub ni tanlang
5. Repository ni tanlang
6. Deploy tugmasini bosing

**URL:** `https://your-app.netlify.app`

---

## 3. **GitHub Pages** ⭐⭐⭐

**Afzalliklari:**
- GitHub bilan to'liq integratsiya
- Tekshiruv va pull request workflow
- Custom domain

**Deploy qilish:**
1. Repository Settings ga o'ting
2. Pages tab ni tanlang
3. Source: "Deploy from a branch" tanlang
4. Branch: "main" tanlang
5. Folder: "/ (root)" tanlang
6. Save tugmasini bosing

**URL:** `https://yourusername.github.io/your-repo-name`

---

## 4. **Firebase Hosting** ⭐⭐⭐⭐

**Afzalliklari:**
- Google infrastructure
- Tez va ishonchli
- Custom domain
- SSL avtomatik

**Deploy qilish:**
1. Firebase Console ga kiring
2. "Add project" tugmasini bosing
3. Project nomini kiriting
4. "Hosting" ni tanlang
5. "Get started" tugmasini bosing
6. Firebase CLI o'rnating
7. `firebase deploy` buyrug'ini ishga tushiring

**URL:** `https://your-project.web.app`

---

## Frontend Deploy uchun Kerakli Fayllar

### 1. **vite.config.js** yangilash

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // GitHub Pages uchun '/your-repo-name/'
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})
```

### 2. **package.json** scripts qo'shish

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "npm run build && npm run deploy:vercel"
  }
}
```

### 3. **Environment Variables**

Frontend uchun `.env` fayl yarating:

```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Amaliyot Platformasi
```

Production uchun:
```env
VITE_API_URL=https://your-backend-domain.com/api
VITE_APP_NAME=Amaliyot Platformasi
```

### 4. **API Service yangilash**

`frontend/src/services/api.ts` faylida:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const apiService = {
  baseURL: API_BASE_URL,
  // ... qolgan kodlar
}
```

---

## Tavsiya qilinadigan Deploy Jarayoni

### **Vercel** (Eng yaxshi variant)

1. **GitHub ga push qiling:**
```bash
cd frontend
git add .
git commit -m "Frontend ready for deploy"
git push origin main
```

2. **Vercel ga deploy:**
- Vercel.com ga kiring
- GitHub bilan connect qiling
- Repository ni tanlang
- Build settings:
  - Framework Preset: Vite
  - Build Command: `npm run build`
  - Output Directory: `dist`
- Deploy tugmasini bosing

3. **Environment Variables qo'shing:**
- Vercel dashboard da Settings > Environment Variables
- `VITE_API_URL` = `https://your-backend-domain.com/api`

### **Backend CORS sozlash**

Backend da CORS_ALLOWED_ORIGINS ga frontend URL ni qo'shing:

```env
CORS_ALLOWED_ORIGINS=https://integrnship-platform.vercel.app,http://localhost:3000
CSRF_TRUSTED_ORIGINS=https://integrnship-platform.vercel.app,http://localhost:3000
```

---

## Deploy Keyin Test Qilish

1. **Frontend:** `https://integrnship-platform.vercel.app`
2. **Backend:** `https://logistika.pythonanywhere.com`
3. **API:** `https://logistika.pythonanywhere.com/api/`
4. **Swagger:** `https://logistika.pythonanywhere.com/swagger/`

---

## Xatoliklar bilan Ishlash

### **CORS Error:**
- Backend da CORS_ALLOWED_ORIGINS ni tekshiring
- Frontend URL ni to'g'ri qo'shing

### **API Connection Error:**
- VITE_API_URL ni tekshiring
- Backend server ishlayotganini tekshiring

### **Build Error:**
- `npm run build` ni local da test qiling
- Dependencies ni tekshiring

---

## Monitoring va Analytics

### **Vercel Analytics:**
- Vercel dashboard da Analytics qo'shing
- Traffic va performance ni kuzating

### **Error Tracking:**
- Sentry.io (tekin)
- LogRocket (tekin)

---

**Eng yaxshi variant:** **Vercel** + **PythonAnywhere** kombinatsiyasi! 🚀
