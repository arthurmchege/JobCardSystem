# Job Card Management System - Master Documentation
    
**Developer:** Arthur Mulunda
**Full Stack Technologies:** React 18, Node.js, Express.js, PostgreSQL, Tailwind CSS, Vite  
**Status:** Development (with mock data)  
**Audience:** Senior Software Engineers (Technical Review Panel)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Global System Architecture](#2-global-system-architecture)
3. [Frontend Architecture (React)](#3-frontend-architecture-react)
4. [Backend Architecture (Node)](#4-backend-architecture-node)
5. [Database Architecture (PostgreSQL)](#5-database-architecture-postgresql)
6. [Security & Authentication](#6-security--authentication)
7. [API Design & Integration](#7-api-design--integration)
8. [Detailed Technical Documents](#8-detailed-technical-documents)

---

## 1. Executive Summary

### 1.1 Problem Statement
The Copy Cat Group operates a field-service task force for photocopier installations, maintenance, and repairs. The legacy paper-based job card system is burdened by lost/delayed job cards, poor operational accountability (no central tracking), lack of real-time visibility for supervisors, and fragmented data reporting.

### 1.2 Solution
The Job Card Management System digitizes the entire pipeline with:
- **Role-based Dashboards:** Custom tailored UI/UX for Technicians (field app views) and Supervisors (management views).
- **Real-time Lifecycle Tracking:** Job cards follow strict state transitions (`pending` → `in_progress` → `completed`).
- **Cryptographic Audit Trails:** Database-level automated triggers ensure foolproof history logging.
- **Robust REST API architecture:** Stateless, horizontal-scale ready, strictly validated node endpoints.

---

## 2. Global System Architecture

The application adopts a decoupled, modern client-server architecture communicating securely over HTTP/JSON.

```text
┌─────────────────────────────────────────────────────────────┐
│                       BROWSER CLIENT                        │
│   React SPA (Vite) | Tailwind CSS | Context API Global State│
└──────────────────────────────┬──────────────────────────────┘
                               │  REST HTTP (JSON)
                               │  JWT Authenticated
┌──────────────────────────────▼──────────────────────────────┐
│                       BACKEND SERVER                        │
│ Node.js | Express.js | Joi Validation | Winston Logger      │
└──────────────────────────────┬──────────────────────────────┘
                               │  pg (node-postgres)
                               │  Connection Pooling
┌──────────────────────────────▼──────────────────────────────┐
│                      DATABASE LAYER                         │
│ PostgreSQL | UUID Primary Keys | Triggers | Strict Checks   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend Architecture (React)

### 3.1 Tech Stack Justification
- **React 18:** Component reusability, Virtual DOM performance.
- **React Router v6:** Declarative routing, nested protected routes.
- **Context API:** Handles global Auth and Toast logic without the overhead of Redux.
- **Tailwind CSS:** Utility-first styling for rapid, consistent UI.
- **Vite:** Superior developer experience and optimized builds compared to Webpack.

### 3.2 Key Patterns
- **Container/Presentational:** Clear split between components that fetch/manage state (e.g., `JobCardList.jsx`) and pure UI components (e.g., `JobCard.jsx`).
- **Higher-Order Components (HOC):** `<ProtectedRoute />` handles auth redirects seamlessly.
- **Render Props / Custom Context:** Robust `<ToastProvider />` handles notifications system-wide.
- **Automated Skeletons & Empty States:** Robust `Skeleton.jsx` and `EmptyState.jsx` for superior UX when loading or when lists are empty.

*(Refer to [Frontend Documentation](./JOB_CARD_FRONTEND_DOCUMENTATION.md) for full component tree hierarchy)*

---

## 4. Backend Architecture (Node)

### 4.1 Layered Architecture
The backend strictly adheres to a **4-layer architecture** separating concerns:
1. **Middleware Pipeline:** `Authenticate` → `Verify Ownership` → `Validate Request (Joi)`.
2. **Controllers (HTTP Layer):** Extracts data, passes to Service Layer, formats HTTP response.
3. **Services (Business Logic):** Validates precise business rules, transforms data, executes transactions.
4. **Database (Data Persistence):** Executes SQL parameterized queries via the `pg` pool.

### 4.2 Key Patterns
- **Repository Pattern (via Services):** Abstracts DB queries away from controllers.
- **Middleware Chain of Responsibility:** Modular security policies stacked per route.
- **Custom Error Factory:** Intercepts logical errors and maps them nicely to structured HTTP responses (`{ success: false, error: ... }`).

---

## 5. Database Architecture (PostgreSQL)

### 5.1 Design Constraints & Philosophy
- **UUID Primary Keys:** Used universally (`users`, `customers`, `job_cards`) to prevent ID enumeration, prediction attacks, and allow future multi-region DB merging without conflicts.
- **Triggers for Defense-in-Depth:** Features like `log_job_status_change()` live purely in Postgres. Even if a system bug bypasses application code, the DB audit log never misses a status change.
- **Enforced State Logic:** Extensive use of `CHECK constraints` ensuring chronological integrity (`actual_end_time >= actual_start_time`).

### 5.2 Entity Relationship Overview
- `Users`: Technicians and Supervisors.
- `Customers`: External client data, isolated from system authentication.
- `Job_Cards`: Core entity linking 1 Tech to 1 Customer with lifecycle timestamps.
- `Job_Status_History`: Immutable append-only log, tied `CASCADE` to cards, `RESTRICT` to users.

*(Refer to [Backend Documentation](./JOB_CARD_BACKEND_DOCUMENTATION.md) for full ERD and raw SQL Schema)*

---

## 6. Security & Authentication

### 6.1 Defense Mechanisms
- **JWT (JSON Web Tokens):** Enables horizontal scaling, securely signed tokens stored client-side in localStorage (future: httpOnly cookies).
- **Password Hashing:** Implemented with `bcrypt` ensuring database breaches do not compromise raw credentials.
- **Rate Limiting:** `express-rate-limit` prevents brute force and DDoS attempts on the endpoints.
- **Defensive Headers:** Handled via `helmet` to mitigate XSS, Clickjacking, and MIME sniffing.
- **Input Sanitization:** `joi` explicitly allows only expected schemas; `xss` library explicitly strips out executable code from string bodies.

### 6.2 Application Role-Based Access Control (RBAC)
- **Supervisors:** Unfettered read/write access to assign jobs, view whole dashboards, and manage users.
- **Technicians:** Strictly isolated; they can only view, update, and interact with Job Cards where `technician_id` maps to their UUID.

---

## 7. API Design & Integration

### 7.1 Restful Best Practices
- Strict JSON structured payload standard responses:
  ```json
  {
    "success": true,
    "message": "Job card updated",
    "data": { ... }
  }
  ```
- Granular mapping of HTTP Status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Server Error`).

---

## 8. Detailed Technical Documents

Below are the deep-dive foundational documents for the individual stacks.

- **[Backend Technical Documentation](./JOB_CARD_BACKEND_DOCUMENTATION.md)** - Covers precise routing, code walk-throughs, all SQL commands, deployment instructions, and test instructions.
- **[Frontend Technical Documentation](./JOB_CARD_FRONTEND_DOCUMENTATION.md)** - Covers API integration intercepts, Component mapping, styling strategy, detailed hooks, and component patterns.

---

*This document synthesizes the overarching structural approach mapped out over the entire Job Card System lifecycle. See the deep-dive documents linked in Section 8 for localized configurations and strict code excerpts.*
