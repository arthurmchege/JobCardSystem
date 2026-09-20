# Job Card System

A full-stack, multi-tenant job card management platform built for field service operations. Designed to be adopted by any organization that dispatches technicians to job sites — whether that's equipment maintenance, installations, repairs, or any other field service work.

---

## What It Does

The Job Card System digitizes the entire field service workflow — from job assignment to completion to payment — replacing manual paperwork and disconnected communication with a single, centralized platform.

**Supervisors** create and assign job cards, monitor technician progress in real time, generate PDF reports, manage customers and users, and collect payments.

**Technicians** receive email notifications for new assignments, update job status from their portal, and submit completion reports with work descriptions.

**Customers** receive automated email notifications when their job is completed, along with a PDF invoice and a secure payment link.

---

## Features

### Core Job Management

- Create, assign, update, and delete job cards
- Full job lifecycle: `Pending → In Progress → Completed`
- Priority levels: Low, Medium, High, Urgent
- Scheduled dates and estimated durations
- Work completion reports with notes
- Customer digital signature capture
- PDF report generation for completed jobs

### User Management

- Role-based access control: Supervisor and Technician roles
- JWT authentication via HTTP-only cookies (XSS-safe)
- User registration, login, and logout
- Supervisors manage all users and job cards; technicians see only their own

### Customer Management

- Full customer directory with search and pagination
- Link customers to job cards
- Customer contact details, address, and contact person

### Payment Integration

- **M-Pesa STK Push** — send payment requests directly to customer's phone
- **Paystack** — hosted checkout with secure payment links sent via email
- Payment status tracking: Unpaid, Pending, Paid
- Payment history per job card
- Invoice resend functionality

### Email Notifications

- Job assignment email to technician (with PDF attachment)
- Job completion email to supervisor
- Customer invoice email with payment link and PDF report
- Built with Nodemailer and Gmail SMTP

### Monitoring Dashboard

- Live Docker container health monitoring via WebSocket
- Host resource gauges: CPU, Memory, Disk
- Backend HTTP health checks with response time logging
- Uptime percentage and average response time tracking
- Application activity feed: logins, payments, emails

---

## Tech Stack

| Layer            | Technology                    |
| ---------------- | ----------------------------- |
| Frontend         | React 19, Vite, Tailwind CSS  |
| Backend          | Node.js, Express              |
| Database         | PostgreSQL                    |
| Monitoring       | Python 3.12, FastAPI, asyncpg |
| Containerization | Docker, Docker Compose        |
| Web Server       | Nginx (reverse proxy + HTTPS) |
| Payments         | M-Pesa Daraja API, Paystack   |
| Email            | Nodemailer, Gmail SMTP        |
| Auth             | JWT, HTTP-only cookies        |

---

## Project Structure

```
JobCardSystem/
├── frontend/          # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── supervisor/    # Supervisor dashboard and views
│   │   │   ├── technician/    # Technician dashboard and views
│   │   │   ├── auth/          # Login and registration
│   │   │   └── payment/       # Customer payment page
│   │   ├── components/        # Reusable UI components
│   │   ├── context/           # Auth context
│   │   ├── services/          # API service layer
│   │   └── hooks/             # Custom React hooks
│   ├── nginx.conf             # Nginx reverse proxy config
│   └── Dockerfile
│
├── backend/           # Node.js + Express REST API
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API route definitions
│   │   ├── middleware/        # Auth, rate limiting, validation
│   │   ├── validators/        # Joi validation schemas
│   │   └── utils/             # Helpers: PDF, email, M-Pesa, sanitization
│   └── Dockerfile
│
├── monitor/           # Python + FastAPI monitoring service
│   ├── app/
│   │   ├── main.py            # FastAPI app, endpoints, WebSocket
│   │   ├── config.py          # Environment configuration
│   │   ├── database.py        # asyncpg connection pool
│   │   ├── docker_monitor.py  # Docker container status
│   │   ├── system_monitor.py  # CPU, memory, disk via psutil
│   │   ├── health_checker.py  # Backend health checks
│   │   ├── summary.py         # Uptime and response time summary
│   │   └── activity_logs.py   # Application event feed
│   └── Dockerfile
│
├── database/          # SQL schema and migrations
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Docker and Docker Compose
- A Gmail account with an App Password for email
- M-Pesa Daraja API credentials (sandbox or production)
- Paystack account and API keys

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/Arthur040419/JobCardSystem.git
cd JobCardSystem
```

2. **Configure environment variables**

Copy the example env file for the backend and fill in your values:

```bash
cp backend/.env.example backend/.env
```

Key variables to set:

```env
DATABASE_URL=postgresql://jobcard_user:yourpassword@postgres:5432/jobcards
JWT_SECRET=your-secret-key
EMAIL_USER=your@gmail.com
EMAIL_PASSWORD=your-app-password
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
PAYSTACK_SECRET_KEY=your-paystack-key
```

Also create `monitor/.env` using the monitor config as a reference.

3. **Generate SSL certificates**

The frontend runs over HTTPS. Generate a self-signed certificate for local development or provide your own:

```bash
# Place cert.pem and key.pem in frontend/ssl/
```

4. **Build and start all containers**

```bash
docker compose up --build
```

5. **Run database migrations**

```bash
docker compose cp database/schema.sql postgres:/tmp/schema.sql
docker compose exec postgres psql -U jobcard_user -d jobcards -f /tmp/schema.sql

docker compose cp monitor/health_check_logs.sql postgres:/tmp/health_check_logs.sql
docker compose exec postgres psql -U jobcard_user -d jobcards -f /tmp/health_check_logs.sql

docker compose cp monitor/activity_logs.sql postgres:/tmp/activity_logs.sql
docker compose exec postgres psql -U jobcard_user -d jobcards -f /tmp/activity_logs.sql
```

6. **Access the application**

| Service            | URL                             |
| ------------------ | ------------------------------- |
| Frontend           | https://localhost               |
| Backend API        | https://localhost/api/v1        |
| Monitoring Service | https://localhost/monitor       |
| API Health Check   | https://localhost/api/v1/health |

---

## API Overview

### Authentication

| Method | Endpoint                | Description         |
| ------ | ----------------------- | ------------------- |
| POST   | `/api/v1/auth/register` | Register a new user |
| POST   | `/api/v1/auth/login`    | Login               |
| POST   | `/api/v1/auth/logout`   | Logout              |
| GET    | `/api/v1/auth/me`       | Get current user    |

### Job Cards

| Method | Endpoint                         | Description                           |
| ------ | -------------------------------- | ------------------------------------- |
| GET    | `/api/v1/job-cards`              | List all job cards (filtered by role) |
| POST   | `/api/v1/job-cards`              | Create a job card                     |
| GET    | `/api/v1/job-cards/:id`          | Get a single job card                 |
| PATCH  | `/api/v1/job-cards/:id`          | Update a job card                     |
| POST   | `/api/v1/job-cards/:id/complete` | Complete a job card                   |
| DELETE | `/api/v1/job-cards/:id`          | Delete a job card                     |
| GET    | `/api/v1/job-cards/:id/pdf`      | Download PDF report                   |
| GET    | `/api/v1/job-cards/stats`        | Job card statistics                   |

### Payments

| Method | Endpoint                        | Description                     |
| ------ | ------------------------------- | ------------------------------- |
| POST   | `/api/v1/payments/initiate`     | Initiate M-Pesa STK Push        |
| POST   | `/api/v1/payments/callback`     | M-Pesa payment callback         |
| GET    | `/api/v1/payments/:id`          | Get payment status              |
| GET    | `/api/v1/payments/job/:jobId`   | Get all payments for a job      |
| GET    | `/api/v1/pay/:token`            | Get Paystack payment details    |
| POST   | `/api/v1/pay/:token/initialize` | Initialize Paystack transaction |
| GET    | `/api/v1/pay/:token/verify`     | Verify Paystack payment         |

### Monitoring

| Method | Endpoint                 | Description                          |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/monitor/health`        | Monitor service health               |
| GET    | `/monitor/docker-status` | Container statuses                   |
| GET    | `/monitor/system-status` | CPU, memory, disk                    |
| GET    | `/monitor/summary`       | Backend uptime summary               |
| GET    | `/monitor/activity-logs` | Application activity feed            |
| WS     | `/monitor/ws`            | Live container updates via WebSocket |

---

## User Roles

### Supervisor

- Full access to all job cards, customers, and users
- Create, assign, update, and delete job cards
- Download PDF reports
- Initiate and track payments
- Access monitoring dashboard

### Technician

- View only their own assigned job cards
- Start and complete jobs
- Submit work completion reports
- Download PDF reports for their jobs

---

## Security

- JWT tokens stored in HTTP-only cookies (not accessible via JavaScript)
- `secure: true` and `sameSite: strict` cookie flags
- Helmet.js for HTTP security headers
- XSS input sanitization on all user input
- Rate limiting on all API routes
- Role-based authorization middleware on all protected routes
- HTTPS enforced via Nginx with SSL termination

---

## License

MIT License — free to use, modify, and distribute.

---

## Author

Built by [Arthur Mulunda](https://github.com/arthurmchege)
