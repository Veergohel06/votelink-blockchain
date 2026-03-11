# Email OTP Architecture & Flow

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Application                    │
│  (React/TypeScript + Vite)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────┐    ┌──────────────────────────┐   │
│  │  EmailOTPVerification  │    │   AuthService Methods    │   │
│  │  Component             │    │  - sendEmailOTP()        │   │
│  │                        │    │  - verifyEmailOTP()      │   │
│  │  ├─ Email Input        │    │  - resendEmailOTP()      │   │
│  │  ├─ OTP Input (6 dig)  │───>│  - setToken()            │   │
│  │  ├─ Timer (5 min)      │    │  - getToken()            │   │
│  │  └─ Resend Button      │    │  - logout()              │   │
│  └────────────────────────┘    └──────────────────────────┘   │
│           │                              │                     │
│           └──────────────────────────────┘                     │
│                      │                                          │
│           ┌──────────v──────────┐                              │
│           │ supabaseConfig.ts   │                              │
│           │ (Client Instance)   │                              │
│           └────────────────────┘                               │
│                      │                                          │
└──────────────────────┼──────────────────────────────────────────┘
                       │
                HTTP / REST API (JSON)
                       │
┌──────────────────────┼──────────────────────────────────────────┐
│                      │                                           │
│           ┌──────────v───────────────────┐                      │
│           │   Backend Express Server     │                      │
│           │   (Node.js - Port 5000)      │                      │
│           └──────────┬───────────────────┘                      │
│                      │                                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │            API Routes (authServer.js)                  │    │
│  │                                                        │    │
│  │  POST /api/auth/send-email-otp                        │    │
│  │  POST /api/auth/verify-email-otp                      │    │
│  │  POST /api/auth/resend-email-otp                      │    │
│  │                                                        │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                             │
│  ┌────────────────v───────────────────────────────────────┐    │
│  │       EmailOTPService                                  │    │
│  │   (services/emailOTPService.js)                        │    │
│  │                                                        │    │
│  │  ├─ sendOTP(email)                                     │    │
│  │  ├─ verifyOTP(email, token)                            │    │
│  │  ├─ resendOTP(email)                                   │    │
│  │  ├─ emailExists(email)                                 │    │
│  │  ├─ getUserByEmail(email)                              │    │
│  │  └─ signOut(accessToken)                               │    │
│  │                                                        │    │
│  └────────────────┬───────────────────────────────────────┘    │
│                   │                                             │
│  ┌────────────────v────────┐        ┌──────────────────────┐  │
│  │ supabase.js Config      │        │ MongoDB (Local)      │  │
│  │ (Backend Client)        │        │ - User accounts      │  │
│  │                         │        │ - Session tracking   │  │
│  │ ├─ supabaseAnon         │        │ - Audit logs         │  │
│  │ └─ supabaseAdmin        │        │ - Vote records       │  │
│  └────────────┬────────────┘        └──────────────────────┘  │
│               │                                                │
└───────────────┼────────────────────────────────────────────────┘
                │
         HTTP / REST API
                │
┌───────────────v────────────────────────────────────────────┐
│         Supabase Cloud Services                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Supabase Auth                                       │ │
│  │  ├─ Email OTP Service                               │ │
│  │  ├─ Session Management                              │ │
│  │  ├─ User Management                                 │ │
│  │  └─ Rate Limiting                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Email Service (Integrated)                          │ │
│  │  ├─ OTP Code Generation                              │ │
│  │  ├─ Email Delivery                                   │ │
│  │  ├─ Email Templates                                  │ │
│  │  └─ Bounce/Delivery Tracking                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
                │
         SMTP Protocol
                │
┌───────────────v────────────────────────────────────────────┐
│              Email Provider                                │
│  (Gmail, Outlook, Yahoo, etc.)                            │
└────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Email OTP Verification

### 1. Request OTP Flow

```
User                Frontend              Backend             Supabase
  │                   │                     │                   │
  │─ Enter Email ──>  │                     │                   │
  │                   │                     │                   │
  │                   │─ POST /send-otp ─> │                   │
  │                   │                     │                   │
  │                   │                     │─ Call sendOTP() ─>│
  │                   │                     │                   │
  │                   │                     │<─ OTP Generated ──│
  │                   │                     │                   │
  │                   │<─ {success:true} ──│                   │
  │                   │                     │                   │
  │<─ Check Email ────│                     │                   │
  │     (get OTP)     │                     │                   │
```

### 2. Verify OTP Flow

```
User              Frontend              Backend             Supabase
  │                 │                     │                   │
  │─ Enter OTP ──> │                     │                   │
  │                 │                     │                   │
  │                 │─ POST /verify-otp->│                   │
  │                 │                     │                   │
  │                 │                     │─ Call verifyOTP()->│
  │                 │                     │                   │
  │                 │                     │<─ Verified ───────│
  │                 │                     │                   │
  │                 │<─ Session Token ────│                   │
  │                 │                     │                   │
  │<─ Logged In! ───│                     │                   │
  │   Redirect      │                     │                   │
```

### 3. Resend OTP Flow

```
User              Frontend              Backend             Supabase
  │                 │                     │                   │
  │─ Click Resend->│                     │                   │
  │    (after 30s) │                     │                   │
  │                 │─ POST /resend ────>│                   │
  │                 │                     │                   │
  │                 │                     │─ Call resendOTP()->│
  │                 │                     │                   │
  │                 │                     │<─ New OTP Gen. ───│
  │                 │                     │                   │
  │                 │<─ {success:true} ──│                   │
  │                 │                     │                   │
  │<─ Check Email ──│                     │                   │
  │   (get new OTP) │                     │                   │
```

---

## Component Relationships

```
AuthService
├── sendEmailOTP(email)
│   └── POST /api/auth/send-email-otp
│       └── emailOTPService.sendOTP(email)
│           └── supabase.auth.signInWithOtp()
│
├── verifyEmailOTP(email, token)
│   └── POST /api/auth/verify-email-otp
│       └── emailOTPService.verifyOTP(email, token)
│           └── supabase.auth.verifyOtp()
│
└── resendEmailOTP(email)
    └── POST /api/auth/resend-email-otp
        └── emailOTPService.resendOTP(email)
            └── emailOTPService.sendOTP(email) [re-call]

EmailOTPVerification Component
├── Uses: AuthService methods
├── Shows: OTP input, timer, resend button
├── Callbacks: onSuccess, onError, onBack
└── Features: Rate limit display, error messages
```

---

## State Management

### Frontend Component State

```
EmailOTPVerification
├── otp: string (6 digits max)
├── loading: boolean (API call in progress)
├── error: string (error message)
├── success: string (success message)
├── timeLeft: number (5 min = 300 sec)
├── canResend: boolean (after 30s cooldown)
├── resendCountdown: number (30 sec)
└── otpSent: boolean (initial send complete)
```

### Backend Session State

```
Session (In Memory)
├── userId: string
├── email: string
├── verified: boolean
├── verifiedAt: timestamp
├── createdAt: timestamp
├── expiresAt: timestamp (24 hours)
└── token: string (random)
```

### Database (MongoDB)

```
Collections:
├── users
│   ├── _id: ObjectId
│   ├── email: string (unique)
│   ├── mobile: string
│   ├── verified: boolean
│   ├── verifiedAt: date
│   └── createdAt: date
│
├── sessions
│   ├── _id: ObjectId
│   ├── userId: ObjectId ref
│   ├── email: string
│   ├── token: string
│   ├── expiresAt: date
│   └── createdAt: date
│
└── auditLogs
    ├── _id: ObjectId
    ├── action: string ('email_otp_sent', 'email_otp_verified')
    ├── userEmail: string
    ├── status: string ('success', 'failed')
    ├── details: object
    └── timestamp: date
```

---

## Request/Response Flow

### Send Email OTP

```
REQUEST:
POST /api/auth/send-email-otp
Content-Type: application/json
Rate-Limited: 5 per 15 minutes

{
  "email": "user@example.com"
}

RESPONSE (Success - 200):
{
  "success": true,
  "message": "OTP sent to your email. Please check your inbox.",
  "data": {
    "email": "user@example.com",
    "sessionId": "uuid"
  }
}

RESPONSE (Error - 400):
{
  "success": false,
  "error": "Invalid email format"
}

RESPONSE (Error - 429):
{
  "success": false,
  "error": "Too many login attempts. Please try again later."
}
```

### Verify Email OTP

```
REQUEST:
POST /api/auth/verify-email-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "token": "123456"
}

RESPONSE (Success - 200):
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "emailConfirmed": "2024-01-23T10:00:00Z"
    },
    "token": "session-token",
    "expiresAt": "2024-01-24T10:00:00Z"
  }
}

RESPONSE (Error - 400):
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

---

## Security Layers

```
┌─────────────────────────────────────────┐
│        Client Input Validation          │
│  ├─ Email format check (regex)          │
│  ├─ OTP format check (6 digits)         │
│  └─ Token existence check               │
└──────────────┬──────────────────────────┘
               │
┌──────────────v──────────────────────────┐
│        Rate Limiting                    │
│  ├─ 5 attempts per 15 minutes           │
│  ├─ Returns 429 on limit exceed         │
│  └─ IP-based tracking                   │
└──────────────┬──────────────────────────┘
               │
┌──────────────v──────────────────────────┐
│        Supabase Auth Service            │
│  ├─ OTP generation & storage            │
│  ├─ Time-based expiration (10 min)      │
│  ├─ One-time use tokens                 │
│  └─ HTTPS encrypted transmission        │
└──────────────┬──────────────────────────┘
               │
┌──────────────v──────────────────────────┐
│        Session Management               │
│  ├─ Random token generation             │
│  ├─ Secure token storage                │
│  ├─ Expiration tracking (24 hours)      │
│  └─ Token rotation support              │
└──────────────┬──────────────────────────┘
               │
┌──────────────v──────────────────────────┐
│        Audit Logging                    │
│  ├─ All OTP events logged               │
│  ├─ Failed attempts tracked             │
│  ├─ Timestamp & IP recording            │
│  └─ Security breach detection           │
└─────────────────────────────────────────┘
```

---

## Deployment Architecture

```
Production Environment:

┌─────────────────────────────────────┐
│    Frontend (React/TypeScript)      │
│    Hosted: Vercel/Netlify/AWS      │
│    HTTPS://yourdomain.com          │
└─────────────────┬───────────────────┘
                  │ HTTPS
                  │
┌─────────────────v───────────────────┐
│   API Load Balancer                 │
│   (CloudFlare/AWS ALB)              │
└─────────────────┬───────────────────┘
                  │
┌─────────────────v───────────────────┐
│  Backend Servers (Multiple)         │
│  Node.js + Express (Port 5000)      │
│  Hosted: AWS/DigitalOcean/Heroku   │
└─────────────────┬───────────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────v─┐  ┌─────v─┐  ┌─────v─┐
│MongoDB │  │Supabase  │ Redis  │
│Instance│  │(Auth SaaS)│(Cache) │
└────────┘  └──────────┘ └────────┘
```

---

## Configuration Dependencies

```
Frontend:
├─ .env
│  ├─ VITE_SUPABASE_URL
│  ├─ VITE_SUPABASE_ANON_KEY
│  └─ VITE_AUTH_API_URL
│
├─ supabaseConfig.ts
│  └─ Initializes Supabase client
│
└─ authService.ts
   └─ Email OTP methods

Backend:
├─ .env
│  ├─ SUPABASE_URL (removed — not used)
│  ├─ EMAIL_USER (Gmail SMTP)
│  ├─ EMAIL_PASS (Gmail App Password)
│  ├─ ADMIN_PASSWORD (admin login)
│  ├─ ADMIN_SECRET_TOKEN (admin API auth)
│  └─ FRONTEND_URL
│
├─ config/supabase.js (removed — not used)
│
└─ services/emailService.js
   └─ OTP logic via Gmail SMTP (nodemailer)

Note: Supabase was removed. Email OTP is now handled entirely by
emailService.js using Gmail SMTP via nodemailer.

Supabase:
├─ Authentication
│  ├─ Email provider (enabled)
│  ├─ Email templates
│  └─ Rate limits
│
└─ Database
   └─ User profiles (optional)
```

---

This architecture ensures:
✅ Scalability - Stateless backend, Supabase managed service
✅ Security - Multiple validation layers, rate limiting, encryption
✅ Reliability - Error handling, audit logging, fallbacks
✅ Maintainability - Clean separation of concerns
✅ Performance - Optimized API calls, caching support
