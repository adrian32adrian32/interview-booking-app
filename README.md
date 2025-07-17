# Interview Booking App

Aplicație web pentru gestionarea programărilor de interviuri, cu sistem complet de autentificare și administrare.

## 🚀 Funcționalități

### Pentru Utilizatori
- ✅ Înregistrare cu nume, prenume și email
- ✅ Autentificare securizată cu JWT
- ✅ Recuperare parolă prin email
- ✅ Dashboard personalizat
- ✅ Programare interviuri online
- ✅ Vizualizare și anulare programări
- ✅ Profil utilizator

### Pentru Administratori
- ✅ Dashboard admin cu statistici
- ✅ Gestionare utilizatori
- ✅ Vizualizare toate programările
- ✅ Creare sloturi de timp pentru interviuri
- ✅ Trimitere email-uri către utilizatori

## 🛠️ Tehnologii Utilizate

### Backend
- Node.js + Express
- PostgreSQL
- JWT pentru autentificare
- Nodemailer pentru email
- PM2 pentru deployment

### Frontend
- Next.js 15.4.1
- TypeScript
- Tailwind CSS v3
- React Hook Form
- Axios pentru API calls

## 📦 Instalare

### Cerințe
- Node.js 18+
- PostgreSQL 14+
- PM2 (pentru producție)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Editează .env cu configurările tale

# Inițializează baza de date
node src/config/init-db.js
node src/config/create-booking-tables.js

# Pornește serverul
npm run dev
# sau cu PM2
pm2 start ecosystem.config.js
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Editează .env.local

# Development
npm run dev

# Production
npm run build
npm start
# sau cu PM2
pm2 start ecosystem.frontend.config.js
```

## 🔧 Configurare

### Variabile de Environment Backend (.env)

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/interview_booking

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Variabile de Environment Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📱 Utilizare

### Acces Aplicație
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Cont Admin Default
- Email: admin@example.com
- Parolă: admin123

## 🚀 Deployment

Aplicația este configurată pentru deployment cu:
- PM2 pentru process management
- Nginx ca reverse proxy
- PostgreSQL pentru baza de date

### Configurare Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📝 API Endpoints

### Autentificare
- `POST /api/auth/register` - Înregistrare utilizator nou
- `POST /api/auth/login` - Autentificare
- `POST /api/auth/logout` - Deconectare
- `POST /api/auth/forgot-password` - Recuperare parolă
- `POST /api/auth/reset-password` - Resetare parolă

### Programări
- `GET /api/bookings/available-slots` - Sloturi disponibile
- `POST /api/bookings/create` - Creare programare
- `GET /api/bookings/my-bookings` - Programările utilizatorului
- `PATCH /api/bookings/:id/cancel` - Anulare programare

### Admin
- `GET /api/admin/users` - Lista utilizatori
- `POST /api/admin/users/create-admin` - Creare admin nou
- `GET /api/admin/dashboard/stats` - Statistici dashboard

## 🤝 Contribuții

Contribuțiile sunt binevenite! Te rog să:
1. Fork-uiește repository-ul
2. Creează un branch pentru feature (`git checkout -b feature/AmazingFeature`)
3. Commit modificările (`git commit -m 'Add some AmazingFeature'`)
4. Push pe branch (`git push origin feature/AmazingFeature`)
5. Deschide un Pull Request

## 📄 Licență

Acest proiect este licențiat sub MIT License.

## 👤 Autor

- GitHub: [@adrian32adrian32](https://github.com/adrian32adrian32)

## 🙏 Mulțumiri

Mulțumiri speciale pentru toate librăriile open source utilizate în acest proiect.