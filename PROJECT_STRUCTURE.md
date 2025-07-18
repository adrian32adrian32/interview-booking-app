# 📁 Structura Proiectului Interview Booking App

## 🗂️ Structura Completă

```
interview-booking-app/
│
├── 📁 backend/                      # Aplicația Node.js/Express
│   ├── 📁 src/
│   │   ├── 📁 config/
│   │   │   └── database.ts         # Configurare conexiune PostgreSQL
│   │   │
│   │   ├── 📁 controllers/
│   │   │   ├── authController.ts   # Logica autentificare
│   │   │   ├── bookingController.ts # CRUD programări
│   │   │   ├── timeSlotController.ts # Gestionare sloturi timp
│   │   │   └── userController.ts   # Gestionare utilizatori
│   │   │
│   │   ├── 📁 middleware/
│   │   │   ├── auth.ts            # Middleware autentificare JWT
│   │   │   ├── authorize.ts       # Middleware autorizare roluri
│   │   │   └── validation.ts      # Validare date input
│   │   │
│   │   ├── 📁 models/
│   │   │   ├── Booking.ts         # Model programare
│   │   │   ├── TimeSlot.ts        # Model slot timp
│   │   │   └── User.ts            # Model utilizator
│   │   │
│   │   ├── 📁 routes/
│   │   │   ├── authRoutes.ts      # /api/auth/*
│   │   │   ├── bookingRoutes.ts   # /api/bookings/*
│   │   │   ├── timeSlotRoutes.ts  # /api/time-slots/*
│   │   │   ├── uploadRoutes.ts    # /api/upload/*
│   │   │   └── userRoutes.ts      # /api/users/*
│   │   │
│   │   ├── 📁 services/
│   │   │   └── emailService.ts    # Serviciu notificări email (TODO)
│   │   │
│   │   ├── 📁 utils/
│   │   │   └── helpers.ts         # Funcții utilitare
│   │   │
│   │   └── server.ts              # Entry point aplicație
│   │
│   ├── 📁 scripts/
│   │   ├── create-admin.js        # Script creare admin
│   │   └── init-db.sql           # Script inițializare DB
│   │
│   ├── 📁 dist/                   # Build TypeScript (generat)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                       # Variabile environment
│   └── ecosystem.config.js        # Configurare PM2
│
├── 📁 frontend/                    # Aplicația Next.js
│   ├── 📁 src/
│   │   ├── 📁 app/                # App Router (Next.js 15)
│   │   │   ├── 📁 (auth)/         # Grup layout auth
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx  # Pagină login
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx  # Pagină înregistrare
│   │   │   │   └── layout.tsx     # Layout auth
│   │   │   │
│   │   │   ├── 📁 admin/          # Zona admin
│   │   │   │   ├── bookings/
│   │   │   │   │   └── page.tsx  # Gestionare programări
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx  # Dashboard admin
│   │   │   │   ├── slots/
│   │   │   │   │   └── page.tsx  # Gestionare sloturi
│   │   │   │   ├── users/
│   │   │   │   │   └── page.tsx  # Gestionare utilizatori
│   │   │   │   └── layout.tsx     # Layout admin
│   │   │   │
│   │   │   ├── 📁 booking/        # Zona publică
│   │   │   │   ├── page.tsx       # Formular programare
│   │   │   │   └── layout.tsx     # Layout booking
│   │   │   │
│   │   │   ├── globals.css        # Stiluri globale
│   │   │   ├── layout.tsx         # Layout principal
│   │   │   └── page.tsx           # Pagină principală
│   │   │
│   │   ├── 📁 components/
│   │   │   ├── 📁 booking/
│   │   │   │   └── BookingForm.tsx # Formular programare
│   │   │   │
│   │   │   ├── 📁 layout/
│   │   │   │   ├── Navbar.tsx     # Bară navigare
│   │   │   │   └── Sidebar.tsx    # Meniu lateral admin
│   │   │   │
│   │   │   └── 📁 ui/             # Componente reutilizabile
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       └── Modal.tsx
│   │   │
│   │   ├── 📁 contexts/
│   │   │   └── AuthContext.tsx    # Context autentificare
│   │   │
│   │   ├── 📁 hooks/
│   │   │   └── useAuth.tsx        # Hook autentificare
│   │   │
│   │   ├── 📁 lib/
│   │   │   ├── api.ts            # Client API
│   │   │   └── utils.ts          # Funcții utilitare
│   │   │
│   │   └── 📁 types/
│   │       └── index.ts          # TypeScript types
│   │
│   ├── 📁 public/                 # Fișiere statice
│   │   └── favicon.ico
│   │
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── .env.local                 # Variabile environment
│
├── 📄 ecosystem.config.js         # PM2 config principal
├── 📄 README.md                   # Documentație
├── 📄 PROJECT_STRUCTURE.md        # Acest fișier
├── 📄 .gitignore
└── 📄 package.json               # Package.json root (opțional)
```

## 🔧 Fișiere de Configurare

### Backend
- **tsconfig.json** - Configurare TypeScript
- **ecosystem.config.js** - PM2 pentru production
- **.env** - Variabile environment (nu se încarcă pe Git)

### Frontend  
- **next.config.js** - Configurare Next.js
- **tailwind.config.js** - Configurare Tailwind CSS
- **tsconfig.json** - Configurare TypeScript
- **.env.local** - Variabile environment (nu se încarcă pe Git)

## 🛣️ Rute API

### Publice
- `POST /api/auth/login` - Autentificare
- `POST /api/auth/register` - Înregistrare
- `POST /api/bookings` - Creare programare
- `GET /api/time-slots/available/:date` - Sloturi disponibile

### Protejate (necesită autentificare)
- `GET /api/auth/me` - Date utilizator curent
- `GET /api/bookings` - Lista programări
- `PUT /api/bookings/:id` - Actualizare programare
- `DELETE /api/bookings/:id` - Ștergere programare
- `GET /api/users` - Lista utilizatori
- `GET /api/time-slots` - Toate sloturile

## 📱 Pagini Frontend

### Publice
- `/` - Pagină principală
- `/login` - Autentificare
- `/register` - Înregistrare
- `/booking` - Formular programare

### Admin (protejate)
- `/admin/dashboard` - Dashboard
- `/admin/bookings` - Gestionare programări
- `/admin/users` - Gestionare utilizatori
- `/admin/slots` - Gestionare sloturi timp

## 🗄️ Structura Bazei de Date

### Tabele
1. **users** - Utilizatori sistem
2. **bookings** - Programări
3. **time_slots** - Sloturi de timp disponibile

## 🚀 Tehnologii Folosite

### Backend
- Node.js + Express.js
- TypeScript
- PostgreSQL
- JWT Authentication
- Bcrypt
- PM2

### Frontend
- Next.js 15.4.1
- TypeScript
- Tailwind CSS
- Lucide Icons
- Axios
- React Hook Form
- Date-fns

## 📝 Note
- Fișierele `.env` și `.env.local` nu sunt incluse în repository
- Folderul `dist/` din backend este generat la build
- Folderul `.next/` din frontend este generat la build
- Fișierele de backup (*.backup, *.old) nu sunt incluse
