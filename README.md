# 🦷 Smile Dental Backend API

Production-grade Node.js/Express backend for Smile Dental Clinic SaaS Platform.

## 📁 Folder Structure

```
src/
├── config/         → App configuration (Supabase, CORS, rate limiting)
├── controllers/    → Handle HTTP requests/responses
├── middleware/     → Auth, role, clinic isolation, audit logging
├── routes/         → API endpoint definitions
├── services/       → Business logic
└── utils/          → Validators, response helpers
```

---

## 🚀 Setup Instructions

### Step 1 — Clone & Install

```bash
cd smile-dental-backend
npm install
```

### Step 2 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create new project: `smile-dental-backend`
3. Go to **SQL Editor** → **New Query**
4. Paste contents of `supabase_schema.sql` and click **Run**
5. Go to **Settings → API**
6. Copy your **Project URL** and **Service Role Key**

### Step 3 — Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env` file:
- `SUPABASE_URL` → from Supabase settings
- `SUPABASE_SERVICE_KEY` → from Supabase settings
- `JWT_SECRET` → generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `REFRESH_TOKEN_SECRET` → generate same way
- `SMTP_USER` → your Gmail address
- `SMTP_PASS` → Gmail App Password (not your regular password)

### Step 4 — Run Locally

```bash
npm run dev
```

Server starts at: http://localhost:3000

### Step 5 — Test Health Check

```bash
curl http://localhost:3000/health
```

Should return: `{"success": true, "message": "Smile Dental API is running"}`

---

## 🚢 Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Select your repo
5. Add environment variables (copy from `.env`)
6. Deploy

Railway will give you a URL like: `https://smile-dental-api.railway.app`

---

## 🔑 API Endpoints

### Authentication (Public)
```
POST /api/auth/login            → Login
POST /api/auth/refresh          → Refresh JWT token
POST /api/auth/logout           → Logout (requires token)
POST /api/auth/forgot-password  → Request reset email
POST /api/auth/reset-password   → Reset with token
GET  /api/auth/me               → Get current user
```

### Users (Admin only)
```
GET    /api/users           → List clinic users
POST   /api/users           → Create user
PUT    /api/users/:id       → Update user
PUT    /api/users/:id/disable → Disable account
PUT    /api/users/:id/enable  → Enable account
```

### Clinic (Authenticated)
```
GET  /api/clinic            → Get clinic info
PUT  /api/clinic/settings   → Update settings (admin)
```

### API Keys (Admin only)
```
GET    /api/keys            → List API keys
POST   /api/keys            → Generate new key
DELETE /api/keys/:id        → Revoke key
```

### n8n Proxy (Authenticated)
```
GET  /api/proxy/slots       → Get available slots
POST /api/proxy/book        → Book appointment
POST /api/proxy/find        → Find appointment
POST /api/proxy/reschedule  → Reschedule appointment
```

### Audit Logs (Admin only)
```
GET /api/audit              → View audit logs
```

---

## 👤 Roles & Permissions

| Action | Super Admin | Admin | Doctor | Receptionist |
|---|---|---|---|---|
| View appointments | ✅ | ✅ | ✅ | ✅ |
| Mark attendance | ✅ | ✅ | ✅ | ✅ |
| Cancel/reschedule | ✅ | ✅ | ❌ | ✅ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ | ❌ |
| Manage API keys | ✅ | ✅ | ❌ | ❌ |
| Manage all clinics | ✅ | ❌ | ❌ | ❌ |

---

## 🔐 Security Features

- **JWT authentication** with 12-hour expiry
- **Refresh token rotation** (7-30 day sessions)
- **Account lockout** after 5 failed attempts
- **Rate limiting** on login and booking
- **CORS** restricted to allowed domains
- **Helmet.js** security headers
- **Multi-clinic isolation** (users only see their clinic data)
- **Audit logging** for all sensitive actions
- **Password hashing** with bcrypt (salt rounds: 12)
- **Input validation** on all endpoints

---

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Auth**: JWT + Refresh Tokens
- **Security**: Helmet, CORS, bcryptjs, express-rate-limit
- **Email**: Nodemailer (Gmail SMTP)
- **Validation**: validator.js

---

## 🐛 Debugging

Common issues:

**"Missing environment variable"**
→ Check your `.env` file has all required values

**"Invalid token"**
→ JWT expired — call `/api/auth/refresh` with refresh token

**"Access denied"**
→ User role doesn't have permission for this action

**Supabase connection error**
→ Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
