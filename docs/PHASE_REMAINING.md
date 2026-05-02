# Qolgan ish — Phase bo'yicha

> Holat: 2026-05-02. PHASE 0–13 (PWA va email tashqari) bajarilgan.
> Asosiy sticky'lar: WebSocket real-time, full E2E test, **deploy oldidan creative polish**.

## ✅ Yakunlangan Phase'lar (sanab chiqamiz)

| Phase | Status | Qisqacha |
|---|---|---|
| **Phase 0** | ✅ | Foundation: monorepo, FastAPI, React, Postgres, Alembic |
| **Phase 1** | ✅ | Auth + RBAC: JWT access/refresh + 4 rol |
| **Phase 2** | ✅ | Akademik tuzilish + HEMIS Excel import (123 talaba) |
| **Phase 3** | ✅ | 8 ta amaliyot turi seed |
| **Phase 4** | ✅ | Tashkilot + Hudud + Supervizor (Leaflet xarita bilan) |
| **Phase 5** | ✅ | Amaliyot biriktirish (yakka + bulk + wizard) |
| **Phase 6** | ✅ | QR shartnoma + WeasyPrint PDF + public verify |
| **Phase 7** | ✅ | Davomat (geo-fence haversine + override + audit) |
| **Phase 8** | ✅ | Topshiriqlar/kundalik/dars tahlili + 43 ta seed |
| **Phase 10** | ✅ | Yig'ma jild ZIP (cover + journal + analyses + tasks + shartnoma) |
| **Phase 11** | ✅ | Dashboard'lar + 30s polling (real-time o'rniga) |
| **Phase 12** | ✅ | Notifications: bell + 11 trigger + dropdown |
| **Phase 13** | ⚠️ qisman | Skeletons, hero banner, animatsiyali maintenance, dark mode bor; PWA va i18n yo'q |

### Sessiyada qo'shilgan kichik feature'lar (eski frontend bilan parallel)
- AdminManagement — super admin admin yarata oladi
- System Settings + Maintenance mode (animatsiyali splash bilan)
- Capacity alerts admin home'da
- File upload + Documents card (drag+drop)
- Profile self-edit + parol o'zgartirish + avatar
- Assignment lifecycle tugmalari (boshlash/yakunlash/bekor qilish)
- Search debounce 300ms
- CSV eksport (talabalar/davomat/biriktirishlar)

---

## ❌ Qoldirilgan ish

### PHASE 9 — 100-ball Grading (**deferred** — user qarori 2026-04-23)
- `GradeBreakdown` model: davomat/tadbirlar/topshiriqlar/hisobot uchun ball tarkibi
- Yakuniy ball hisoblash logikasi
- Kafedra mudiri uchun "Hisobot himoyasi" baho roli
- Talaba progress bar to'liq baho ko'rinishida
- Admin grade table + export

> **Eslatma**: hozir task'larda `points_earned` bor — manual ballash ishlaydi, lekin 4 mezon bo'yicha agregatsiya yo'q.

### PHASE 13 — i18n (PWA chiqarib tashlangan)
- `react-i18next` setup (uz default + ru/en stub)
- Asosiy stringlarni JSON'ga ekstrakt
- Til o'zgartirish menyusi
- Sana/raqam formatlash

### PHASE 14 — Testing + CI/CD + Deploy
- **M14.1 Testing**:
  - pytest: models/services/API (80% kritik path)
  - Playwright E2E: login + shartnoma + check-in + topshiriq submit
- **M14.2 CI (GitHub Actions)**:
  - Lint (ruff, eslint)
  - Test (pytest + vitest + playwright)
  - Docker image build + push
- **M14.3 CD (Ubuntu VPS)**:
  - `infra/compose/docker-compose.prod.yml`
  - Nginx + Certbot (Let's Encrypt)
  - DB backup pg_dump → S3/local cron
  - Sentry integratsiya
  - Zero-downtime deploy script
- **WebSocket real-time** — Phase 14 ichida (Redis pub/sub, ws hook, channels: user/role/assignment)

### Kichik gap'lar
- **Bulk select + bulk delete** jadvallarda (cascade sabab kechiktirildi)
- **Forgot password** — SMTP siz amalga oshmaydi (admin orqali parol qaytarish bor)
- **Email notifications** — SMTP infra (Phase 14)
- **Avatar dialog** — hozir oddiy upload, crop+resize keyin

### Eski'da bor lekin yo'q
- WebSocket — eski'da bor edi, biz polling. Phase 14 da qaytariladi.
- Internship Grading rubric (5 ball) — bizda 100 ball Phase 9, hozir task ball'i bor.

---

## 🎨 Deploy oldi — Creative Polish (Phase 15)

User qarori (2026-05-02): har bir holat (state) uchun creative ishlash kerak.

### Vizual polish
- Loading states — har sahifaga unique skeleton variant
- Empty states — illustration/icon bilan, action tugmasi
- Error pages: 404 / 500 / network error — illustrated
- Maintenance ekrani allaqachon animatsiyali — boshqa ekranlarni shu darajaga olib chiqish
- Dark mode audit — har sahifa light/dark'da to'g'ri ko'rinishi

### UI komponent polish
- Hero banner gradient'lar — "liquid glass" overlay variant
- Stat card'larga shimmer hover
- Modal'larga slide-in animatsiya
- Toast pozitsiyasi va variantlar
- Form validation — inline real-time feedback
- Sidebar collapse/expand animatsiya

### UX polish
- Keyboard shortcut'lar (Cmd+K — global search)
- Onboarding tour (admin uchun birinchi marta)
- Confirmation toast — Undo tugmasi bilan ("o'chirildi · QAYTARISH")
- Optimistic UI updates (avval UI, keyin server)

### Performance
- Code splitting per route (lazy load)
- Image optimization
- Bundle analyzer
- Stale-while-revalidate strategiyasi

### Accessibility
- ARIA label'lar
- Keyboard navigation (Tab + Enter + Esc)
- Color contrast tekshirish (WCAG AA)
- Screen reader test
- Focus indicator'lar
