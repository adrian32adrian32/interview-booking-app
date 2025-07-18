# Interview Booking App

Aplicație completă pentru gestionarea programărilor la interviuri.

## Stack Tehnologic
- Frontend: Next.js 15, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL
- Server: Nginx (reverse proxy)

## Funcționalități
- ✅ Autentificare și autorizare
- ✅ Dashboard admin
- ✅ Gestionare utilizatori
- ✅ Programări interviuri
- ✅ Sloturi disponibile

## Deployment
Aplicația rulează pe: http://94.156.250.138

## Setup Local
1. Clone repository
2. Install dependencies: `npm install`
3. Configure .env files
4. Run: `npm run dev`

---
# Interview Booking App 📅

O aplicație web modernă pentru gestionarea eficientă a programărilor la interviuri, dezvoltată cu Next.js și Node.js.

## 🚀 Demo Live

🌐 **URL Production**: http://94.156.250.138

### Credențiale Admin
- **Email**: admin@example.com
- **Parolă**: admin123

## ✨ Funcționalități

### Pentru Clienți
- ✅ **Formular de programare intuitiv** - Proces în 3 pași simpli
- ✅ **Calendar interactiv** - Selectare ușoară a datei dorite
- ✅ **Sloturi de timp în timp real** - Vezi disponibilitatea instantaneu
- ✅ **Confirmare imediată** - Primești confirmarea pe loc
- ✅ **Interviuri flexibile** - Alege între online sau în persoană

### Pentru Administratori
- ✅ **Dashboard centralizat** - Toate informațiile într-un singur loc
- ✅ **Gestionare utilizatori** - Control complet asupra accesului
- ✅ **Statistici în timp real** - Monitorizează performanța
- ✅ **API RESTful securizat** - Integrare ușoară cu alte sisteme
- 🚧 **Notificări email automate** (în dezvoltare)
- 🚧 **Calendar view avansat** (în dezvoltare)
- 🚧 **Rapoarte detaliate** (în dezvoltare)
- 🚧 **Export date** (în dezvoltare)

## 🛠️ Stack Tehnologic

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js cu TypeScript
- **Database**: PostgreSQL 14
- **Autentificare**: JWT (JSON Web Tokens)
- **ORM**: SQL direct cu pg library
- **Validare**: Express validators

### Frontend
- **Framework**: Next.js 15.4.1
- **Limbaj**: TypeScript
- **Styling**: Tailwind CSS 3
- **Iconițe**: Lucide React
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Componente UI**: Custom components

### DevOps & Deployment
- **Server**: Ubuntu 22.04 LTS
- **Web Server**: Nginx (reverse proxy)
- **Process Manager**: PM2
- **SSL**: Let's Encrypt (de configurat)
- **Monitoring**: PM2 metrics
- **Version Control**: Git + GitHub

## 📁 Structura Proiectului

```
interview-booking-app/
├── backend/                    # Aplicația Node.js
│   ├── src/
│   │   ├── config/            # Configurări (DB, env)
│   │   ├── controllers/       # Logica business
│   │   ├── middleware/        # Auth, CORS, validări
│   │   ├── models/           # Modele de date
│   │   ├── routes/           # Definirea rutelor API
│   │   ├── services/         # Servicii externe
│   │   ├── utils/            # Funcții utilitare
│   │   └── server.ts         # Entry point
│   ├── scripts/              # Scripturi DB
│   ├── dist/                 # Build TypeScript
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                  # Aplicația Next.js
│   ├── src/
│   │   ├── app/              # App router (Next.js 15)
│   │   │   ├── booking/      # Pagina publică booking
│   │   │   ├── admin/        # Zona admin
│   │   │   └── layout.tsx    # Layout principal
│   │   ├── components/       # Componente React
│   │   │   ├── booking/      # Componente booking
│   │   │   └── layout/       # Layout components
│   │   ├── contexts/         # React Context
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Utilități
│   │   └── types/            # TypeScript types
│   ├── public/               # Fișiere statice
│   ├── package.json
│   └── next.config.js
│
├── ecosystem.config.js        # Configurare PM2
├── .gitignore
├── .env.example              # Template variabile
└── README.md                 # Acest fișier
```

## 🚀 Instalare și Dezvoltare

### Cerințe Sistem
- Node.js 18+ 
- PostgreSQL 14+
- npm sau yarn
- Git

### 1. Clonează Repository

```bash
git clone https://github.com/adrian32adrian32/interview-booking-app.git
cd interview-booking-app
```

### 2. Configurare Backend

```bash
# Navighează în backend
cd backend

# Instalează dependențe
npm install

# Creează fișier .env
cp .env.example .env

# Editează .env cu datele tale
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=interview_booking_db
# DB_USER=postgres
# DB_PASSWORD=your_password
# JWT_SECRET=your_secret_key
# PORT=5000

# Creează baza de date
createdb interview_booking_db

# Rulează migrările
npm run migrate

# Compilează TypeScript
npm run build

# Pornește serverul
npm run dev
```

### 3. Configurare Frontend

```bash
# Navighează în frontend
cd ../frontend

# Instalează dependențe
npm install

# Creează fișier .env.local
cp .env.example .env.local

# Editează .env.local
# NEXT_PUBLIC_API_URL=http://localhost:5000

# Pornește aplicația
npm run dev
```

### 4. Accesează Aplicația

- Frontend: http://localhost:3000
- API: http://localhost:5000
- Booking: http://localhost:3000/booking

## 📝 API Endpoints

### Autentificare
```
POST   /api/auth/login       # Login
POST   /api/auth/register    # Înregistrare
POST   /api/auth/logout      # Logout
GET    /api/auth/me          # Date utilizator curent
```

### Programări (Bookings)
```
GET    /api/bookings          # Lista programări (auth)
GET    /api/bookings/:id      # Detalii programare (auth)
POST   /api/bookings          # Creează programare (public)
PUT    /api/bookings/:id      # Actualizează programare (auth)
DELETE /api/bookings/:id      # Șterge programare (auth)
```

### Sloturi de Timp
```
GET    /api/time-slots                    # Toate sloturile (auth)
GET    /api/time-slots/available/:date    # Sloturi disponibile (public)
POST   /api/time-slots/check              # Verifică disponibilitate (public)
```

### Utilizatori
```
GET    /api/users             # Lista utilizatori (auth)
GET    /api/users/:id         # Detalii utilizator (auth)
POST   /api/users             # Creează utilizator (auth)
PUT    /api/users/:id         # Actualizează utilizator (auth)
DELETE /api/users/:id         # Șterge utilizator (auth)
```

## 🔧 Comenzi Utile

### Development
```bash
# Backend
cd backend
npm run dev          # Pornește cu nodemon
npm run build        # Compilează TypeScript
npm run start        # Pornește producție

# Frontend
cd frontend
npm run dev          # Development server
npm run build        # Build producție
npm run start        # Start producție
npm run lint         # Verifică codul
```

### PM2 (Production)
```bash
pm2 status           # Vezi status procese
pm2 logs             # Vezi loguri
pm2 restart all      # Repornește tot
pm2 save             # Salvează configurația
pm2 monit            # Monitorizare live
```

### Database
```bash
# Conectare la DB
sudo -u postgres psql interview_booking_db

# Backup
pg_dump interview_booking_db > backup.sql

# Restore
psql interview_booking_db < backup.sql
```

### Nginx
```bash
# Test configurație
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Logs
tail -f /var/log/nginx/access.log
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Găsește procesul
lsof -i :3000

# Oprește procesul
kill -9 PID
```

### Database Connection Error
1. Verifică PostgreSQL rulează: `sudo systemctl status postgresql`
2. Verifică credențialele în `.env`
3. Verifică portul: `sudo netstat -plnt | grep postgres`

### CORS Errors
1. Verifică `FRONTEND_URL` în backend `.env`
2. Verifică Nginx configurația pentru headers

## 🚧 Roadmap

### În Dezvoltare
- [ ] Sistem de notificări email
- [ ] Calendar view pentru admin
- [ ] Export programări (CSV/PDF)
- [ ] Integrare Google Calendar
- [ ] Reminder-uri automate

### Planificate
- [ ] Aplicație mobilă
- [ ] Multi-language support
- [ ] Teme multiple (dark mode)
- [ ] Webhook-uri pentru integrări
- [ ] Sistem de feedback post-interviu
- [ ] Video call integration
- [ ] Dashboard analytics avansat

## 🤝 Contribuții

Contribuțiile sunt binevenite! Pentru a contribui:

1. Fork acest repository
2. Creează un branch (`git checkout -b feature/NumeFunctionalitate`)
3. Commit modificările (`git commit -m 'Adaugă funcționalitate nouă'`)
4. Push branch-ul (`git push origin feature/NumeFunctionalitate`)
5. Deschide un Pull Request

### Coding Standards
- Folosește TypeScript pentru type safety
- Urmează convenția de naming existentă
- Scrie cod comentat și clar
- Adaugă teste pentru funcționalități noi
- Actualizează documentația

## 📄 Licență

Acest proiect este licențiat sub MIT License - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## 👥 Echipa

- **Adrian** - Developer Principal - [@adrian32adrian32](https://github.com/adrian32adrian32)

## 🙏 Mulțumiri

- Next.js team pentru framework-ul excelent
- Vercel pentru documentație
- Comunitatea open-source

---

**Dezvoltat cu ❤️ pentru o experiență mai bună în procesul de recrutare**