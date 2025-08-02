# Interview Booking App 📅

O aplicație web full-stack modernă pentru gestionarea programărilor la interviuri, cu sistem complet de administrare, multilingvism și funcționalități avansate.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](http://94.156.250.138)
[![Next.js](https://img.shields.io/badge/Next.js-15.4.1-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14-336791)](https://www.postgresql.org/)

## 🚀 Demo Live

**🌐 URL Production:** http://94.156.250.138

### Conturi de Test
- **Admin:** `admin@interview-app.com` / `admin123`
- **User:** `test@example.com` / `test123`

## ✨ Funcționalități Principale

### 🌐 Sistem Multilingvism
- **8 limbi suportate**: Română 🇷🇴, Engleză 🇬🇧, Spaniolă 🇪🇸, Franceză 🇫🇷, Germană 🇩��, Italiană 🇮🇹, Poloneză 🇵🇱, Maghiară 🇭🇺
- Schimbare limbă în timp real
- Toate interfețele traduse complet

### 👤 Portal Utilizatori
- ✅ **Înregistrare și autentificare** securizată
- ✅ **Dashboard personal** cu statistici
- ✅ **Programare interviuri** - proces în 3 pași
- ✅ **Upload documente** (PDF, JPG, PNG)
- ✅ **Istoric programări** cu status real-time
- ✅ **Profil editabil** cu avatar
- ✅ **Notificări în timp real**

### 👨‍💼 Portal Administrator
- ✅ **Dashboard avansat** cu grafice interactive
- ✅ **Gestionare utilizatori** (CRUD complet)
- ✅ **Calendar drag & drop** pentru reprogramări
- ✅ **Email templates** personalizabile
- ✅ **Statistici detaliate** și rapoarte
- ✅ **Export date** (CSV/Excel)
- ✅ **Configurare sloturi timp**
- ✅ **Setări sistem complete**

### 📧 Sistem Email
- ✅ **Integrare Resend API** pentru producție
- ✅ **Template-uri HTML** responsive
- ✅ **Email-uri automate**:
  - Confirmare înregistrare
  - Confirmare programare
  - Reminder-uri (24h înainte)
  - Notificări reprogramare
  - Reset parolă
- ✅ **Bulk email** pentru admin
- ✅ **Tracking deschidere** și click-uri

### 🎨 UI/UX
- ✅ **3 Teme**: Light, Dark, Futuristic
- ✅ **Responsive design** (mobile-first)
- ✅ **Animații smooth**
- ✅ **Toast notifications**
- ✅ **Loading states** pentru toate acțiunile
- ✅ **Error handling** cu mesaje clare

## 🛠️ Stack Tehnologic

### Backend
```yaml
Runtime: Node.js v20.x
Framework: Express.js 4.x + TypeScript
Database: PostgreSQL 14
ORM: Raw SQL cu pg library
Authentication: JWT + bcrypt
Email: Resend API (production)
File Upload: Multer
Validation: express-validator
Process Manager: PM2
Real-time: Socket.io (pregătit)
```

### Frontend
```yaml
Framework: Next.js 15.4.1 (App Router)
Language: TypeScript 5.x
Styling: Tailwind CSS 3.x
UI Components: 
  - Custom components
  - shadcn/ui
  - Lucide React (icons)
State: React Context API
Forms: React Hook Form + Zod
Charts: Chart.js + Recharts
HTTP: Axios cu interceptori
Notifications: React Hot Toast
Date: date-fns
```

### Infrastructure
```yaml
Server: Ubuntu 22.04 LTS
Web Server: Nginx (reverse proxy)
Process Manager: PM2
SSL: Let's Encrypt (configurat)
Domain: IP dedicat (94.156.250.138)
Ports:
  - Frontend: 3001
  - Backend: 5000
  - Nginx: 80/443
```

## 📁 Structura Proiectului

```
interview-booking-app/
├── backend/                    # API Express.js
│   ├── src/
│   │   ├── config/            # Configurări DB și app
│   │   ├── controllers/       # Logica business
│   │   ├── middleware/        # Auth, rate limiting
│   │   ├── models/           # Modele TypeScript
│   │   ├── routes/           # Endpoint-uri API
│   │   ├── services/         # Email, cron jobs
│   │   ├── templates/        # Template-uri email
│   │   └── server.ts         # Entry point
│   ├── uploads/              # Fișiere utilizatori
│   ├── scripts/              # Scripturi admin
│   └── dist/                 # Build TypeScript
│
├── frontend/                  # Aplicația Next.js
│   ├── src/
│   │   ├── app/              # App Router
│   │   │   ├── (admin)/      # Zona admin
│   │   │   ├── (auth)/       # Autentificare
│   │   │   ├── (dashboard)/  # Zona user
│   │   │   └── booking/      # Pagină publică
│   │   ├── components/       # Componente React
│   │   ├── contexts/         # Context providers
│   │   ├── translations/     # Fișiere traduceri
│   │   ├── hooks/            # Custom hooks
│   │   └── lib/              # Utilități
│   ├── public/               # Assets statice
│   └── .next/                # Build Next.js
│
├── ecosystem.config.js        # Configurare PM2
├── .gitignore
└── README.md                 # Acest fișier
```

## 📝 API Documentation

### Base URL
- **Production:** `http://94.156.250.138/api`
- **Development:** `http://localhost:5000/api`

### Authentication
Toate request-urile (exceptând cele publice) necesită JWT token:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Endpoints Principale

#### 🔐 Autentificare
```bash
POST   /api/auth/register       # Înregistrare
POST   /api/auth/login          # Autentificare
POST   /api/auth/logout         # Delogare
GET    /api/auth/me             # Date utilizator curent
POST   /api/auth/refresh        # Refresh token
POST   /api/auth/forgot-password # Cerere resetare parolă
POST   /api/auth/reset-password  # Resetare cu token
```

#### 📅 Programări
```bash
GET    /api/bookings            # Lista (cu filtrare)
POST   /api/bookings            # Creare programare
GET    /api/bookings/:id        # Detalii
PUT    /api/bookings/:id        # Actualizare
DELETE /api/bookings/:id        # Ștergere
GET    /api/bookings/my-bookings # Programările mele
GET    /api/bookings/time-slots/available/:date # Sloturi libere
```

#### 👥 Utilizatori (Admin)
```bash
GET    /api/users               # Lista utilizatori
POST   /api/users               # Creare utilizator
GET    /api/users/:id           # Detalii
PUT    /api/users/:id           # Actualizare
DELETE /api/users/:id           # Ștergere
POST   /api/users/:id/toggle-status # Activare/Dezactivare
```

#### 📁 Documente
```bash
POST   /api/upload/document     # Upload
GET    /api/upload/download/:id # Download
DELETE /api/upload/document/:id # Ștergere
GET    /api/documents/user/:userId # Documente user
```

#### 📧 Email Templates
```bash
GET    /api/email-templates     # Lista template-uri
POST   /api/email-templates     # Creare template
PUT    /api/email-templates/:id # Actualizare
DELETE /api/email-templates/:id # Ștergere
POST   /api/email-templates/send-test # Test email
```

#### 📊 Statistici & Export
```bash
GET    /api/statistics/dashboard # Stats dashboard
GET    /api/statistics/bookings  # Stats programări
POST   /api/export/bookings      # Export CSV/Excel
POST   /api/export/users         # Export utilizatori
```

## 🚀 Instalare și Dezvoltare

### Cerințe Sistem
- Node.js 18+ 
- PostgreSQL 14+
- npm/yarn
- Git

### 1. Clone Repository
```bash
git clone https://github.com/adrian32adrian32/interview-booking-app.git
cd interview-booking-app
```

### 2. Setup Backend
```bash
cd backend
npm install

# Configurare environment
cp .env.example .env
# Editează .env cu configurările tale

# Setup database
createdb interview_booking_db
npm run migrate

# Development
npm run dev

# Production build
npm run build
npm start
```

### 3. Setup Frontend
```bash
cd ../frontend
npm install

# Configurare environment
cp .env.local.example .env.local

# Development
npm run dev

# Production build
npm run build
npm start
```

### 4. Environment Variables

#### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=interview_booking_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=production

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=Interview Booking

# Frontend
FRONTEND_URL=http://localhost:3001
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## 🌐 Deployment

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name 94.156.250.138;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # Uploads
    location /uploads {
        alias /home/apps/interview-booking-app/backend/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### PM2 Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'interview-backend',
      script: './backend/dist/server.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'interview-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

## 🔧 Comenzi Utile

### Development
```bash
# Backend
cd backend && npm run dev

# Frontend  
cd frontend && npm run dev

# Ambele simultan (din root)
npm run dev
```

### Production
```bash
# Build
cd backend && npm run build
cd ../frontend && npm run build

# Deploy cu PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Database
```bash
# Backup
pg_dump -U postgres interview_booking_db > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres interview_booking_db < backup.sql

# Conectare
psql -U postgres -d interview_booking_db
```

### Monitoring
```bash
# PM2
pm2 status
pm2 logs
pm2 monit

# Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
```

## 🔒 Securitate

- ✅ **Passwords**: Bcrypt cu salt rounds 10
- ✅ **JWT**: Tokens cu expirare 7 zile
- ✅ **CORS**: Configurare strictă
- ✅ **Rate Limiting**: 100 req/15min per IP
- ✅ **Input Validation**: Pe toate rutele
- ✅ **SQL Injection**: Parametrized queries
- ✅ **XSS Protection**: Helmet.js
- ✅ **File Upload**: Validare tip și dimensiune

## 🐛 Troubleshooting

### Port în uz
```bash
lsof -i :3001
kill -9 PID
```

### Erori Database
```bash
sudo systemctl restart postgresql
sudo -u postgres psql
```

### Erori CORS
- Verifică `FRONTEND_URL` în backend .env
- Verifică configurația Nginx

## 🚧 Roadmap

### În dezvoltare
- [ ] Notificări push
- [ ] Video call integration
- [ ] Google Calendar sync
- [ ] Mobile app (React Native)

### Planificate
- [ ] AI pentru sugestii programări
- [ ] Sistem feedback post-interviu
- [ ] Integrare Slack/Teams
- [ ] API webhooks

## 🤝 Contribuții

1. Fork repository
2. Creează branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 Licență

Acest proiect este licențiat sub MIT License - vezi [LICENSE](LICENSE) pentru detalii.

## 👥 Contact

**Adrian** - [@adrian32adrian32](https://github.com/adrian32adrian32)

Link Proiect: [https://github.com/adrian32adrian32/interview-booking-app](https://github.com/adrian32adrian32/interview-booking-app)

---

<p align="center">Dezvoltat cu ❤️ pentru o experiență mai bună în procesul de recrutare</p>
