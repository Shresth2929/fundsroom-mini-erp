# FundsRoom Mini ERP / CRM Operations Portal

A full-stack ERP + CRM Operations Portal built for campus placement evaluation.

---

## 📋 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express.js |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Frontend | React 19, TypeScript, Vite |
| Authentication | JWT (jsonwebtoken) |
| Validation | Zod (backend), native (frontend) |

---

## 🗂️ Project Structure

```
fundsroom-mini-erp/
├── server/                  # Express.js backend
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── seed.ts          # Demo data seeder
│   │   └── migrations/
│   ├── src/
│   │   ├── app.ts           # Express app configuration
│   │   ├── server.ts        # Entry point
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # Express routers
│   │   ├── middleware/      # Auth & RBAC guards
│   │   ├── validators/      # Zod schemas
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Custom error classes
│   ├── scratch/
│   │   └── test_challans.ts # Integration test runner
│   ├── .env                 # Local config (not committed)
│   └── .env.example         # Config reference
│
└── client/                  # React frontend
    ├── src/
    │   ├── components/
    │   │   ├── Layout.tsx       # Sidebar + header shell
    │   │   └── ProtectedRoute.tsx # Auth + RBAC route guard
    │   ├── context/
    │   │   └── AuthContext.tsx  # Authentication state
    │   ├── pages/
    │   │   ├── Login.tsx        # Login form
    │   │   ├── Dashboard.tsx    # Overview + live metrics
    │   │   ├── Customers.tsx    # Placeholder (next milestone)
    │   │   ├── Products.tsx     # Placeholder (next milestone)
    │   │   ├── Inventory.tsx    # Placeholder (next milestone)
    │   │   └── Challans.tsx     # Placeholder (next milestone)
    │   ├── services/
    │   │   └── api.ts           # Typed fetch wrapper
    │   ├── types/
    │   │   └── index.ts         # TypeScript interfaces
    │   └── App.tsx              # Router + route definitions
    ├── .env                 # VITE_API_URL (not committed)
    └── .env.example
```

---

## 🚀 Running the Project

### 1. Backend

```bash
cd server
npm install
npm run dev
# Server starts at http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev
# App starts at http://localhost:5173
```

### Environment Variables

**server/.env** (see `.env.example`):
```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
PORT=5000
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:5173
```

**client/.env** (see `.env.example`):
```
VITE_API_URL=http://localhost:5000/api
```

---

## 👤 Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | admin123 |
| Sales | sales@example.com | sales123 |
| Warehouse | warehouse@example.com | warehouse123 |
| Accounts | accounts@example.com | accounts123 |

---

## 🔐 Role-Based Access Matrix

| Module | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Customers CRM | ✅ | ✅ | ❌ | ✅ |
| Product Catalog | ✅ | ✅ | ✅ | ✅ |
| Inventory Movements | ✅ | ❌ | ✅ | ❌ |
| Delivery Challans | ✅ | ✅ | ❌ | ✅ |

---

## 🛠️ Backend API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Authenticated | Get current user info |

### Customers
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/customers` | All roles | List with pagination + filters |
| GET | `/api/customers/:id` | All roles | Get customer by ID |
| POST | `/api/customers` | ADMIN, SALES | Create customer |
| PUT | `/api/customers/:id` | ADMIN, SALES | Update customer |
| DELETE | `/api/customers/:id` | ADMIN | Delete customer |

### Products
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/products` | All roles | List with pagination + filters |
| GET | `/api/products/:id` | All roles | Get product by ID |
| POST | `/api/products` | ADMIN, WAREHOUSE | Create product |
| PUT | `/api/products/:id` | ADMIN, WAREHOUSE | Update product |
| DELETE | `/api/products/:id` | ADMIN | Delete product |

### Inventory
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/inventory/movements` | All roles | List stock movements |
| GET | `/api/inventory/low-stock` | All roles | Products at/below min stock |
| POST | `/api/inventory/:productId/movement` | ADMIN, WAREHOUSE | Record stock movement |

### Challans
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/challans` | All roles | List with pagination + filters |
| GET | `/api/challans/:id` | All roles | Get challan with full items |
| POST | `/api/challans` | ADMIN, SALES | Create challan |
| PUT | `/api/challans/:id` | ADMIN, SALES | Update / change status |
| DELETE | `/api/challans/:id` | ADMIN | Delete (DRAFT/CANCELLED only) |

---

## 📦 Database Seeding

```bash
cd server
npm run prisma:seed
```

> ⚠️ This will **clear** existing data and re-seed demo records. Use with caution on production.

---

## ✅ Completed Milestones

- [x] Database schema design and Prisma setup
- [x] Supabase PostgreSQL integration
- [x] Initial migration
- [x] Seed data (users, customers, products, challans)
- [x] JWT Authentication & RBAC middleware
- [x] Customer CRM CRUD APIs
- [x] Product Catalog CRUD APIs
- [x] Stock movement & low-stock tracking APIs
- [x] Challans module (DRAFT → CONFIRMED → CANCELLED lifecycle with atomic stock updates)
- [x] React frontend foundation (Auth, RBAC navigation, Dashboard)

## 🔜 Upcoming Milestones

- [ ] Customer CRM full UI (list, search, create, edit)
- [ ] Product Catalog full UI
- [ ] Inventory Movement logging UI + low-stock alerts
- [ ] Challans full UI (create, view, status management)
- [ ] Deployment (Render/Railway for backend, Vercel/Netlify for frontend)
