# POS Billing & Asynchronous WhatsApp Microservices Setup

This repository contains a production-grade, highly scalable microservices POS billing and customer broadcast architecture. It combines a **MERN (MongoDB, Express, React, Node)** POS application with a high-performance **Go (Golang) distributed background worker** utilizing **Redis** as a message broker.

---

## 🏗️ System Architecture

```
                        +----------------------------+
                        |  React POS Billing UI      |  (Mobile-First, Tailwind CSS)
                        +--------------+-------------+
                                       |
                                       | 1. HTTP POST /api/bills
                                       v
                        +--------------+-------------+
                        |   Node.js / Express API    |  (Saves to MongoDB)
                        +-------+--------------+-----+
                                |              |
                     2. Persist |              | 3. LPUSH Task
                                v              v
                        +-------+----+   +-----+-----+
                        |  MongoDB   |   |   Redis   |  (Reliable List Queue: 'queue:bills')
                        +------------+   +-----+-----+
                                               ^
                                               | 4. BRPOP / BLMOVE
                                               v
                        +----------------------+-----+
                        |    Go Worker Pool          |  (Distributed & Bounded Concurrency)
                        |  - Worker Goroutines       |
                        |  - Atomic Lock: lock:bill  |  (Redis SETNX Distributed Lock)
                        +--------------+-------------+
                                       |
                                       | 5. HTTP POST API Request
                                       v
                        +--------------+-------------+
                        |   WhatsApp Cloud API       |  (Official Gateway)
                        +----------------------------+
```

---

## 📂 Repository Contents

- [**`docker-compose.yml`**](file:///c:/Users/Dell/Desktop/Bill-generation/docker-compose.yml): Spins up MongoDB and Redis in isolated local environments.
- [**`backend/`**](file:///c:/Users/Dell/Desktop/Bill-generation/backend/): Express.js REST API using Mongoose ODM and `ioredis` to manage products, customers, transactions, and push message payloads to the queue.
  - [Mongoose Schemas](file:///c:/Users/Dell/Desktop/Bill-generation/backend/src/models/): `Product.js`, `Customer.js`, `Bill.js`.
  - [Billing Endpoint](file:///c:/Users/Dell/Desktop/Bill-generation/backend/src/routes/billRoutes.js): Atomically processes sales, inventory deductions, and publishes queue events.
- [**`go-worker/`**](file:///c:/Users/Dell/Desktop/Bill-generation/go-worker/): Golang service featuring bounded goroutine worker pool, atomic distributed locks via Redis SETNX, and WhatsApp HTTP dispatch clients.
- [**`frontend/`**](file:///c:/Users/Dell/Desktop/Bill-generation/frontend/): React + Tailwind CSS mobile-first billing UI.
  - [BillingInterface.jsx](file:///c:/Users/Dell/Desktop/Bill-generation/frontend/src/components/BillingInterface.jsx): Responsive catalog selector, cart state, total sum calculator, and phone validator.
- [**`git-commit-helper.js`**](file:///c:/Users/Dell/Desktop/Bill-generation/git-commit-helper.js): Cross-platform Node.js git commit helper to automatically stage and commit files with descriptive summaries.

---

## 🚀 Setting Up the Services Locally

### Step 1: Run the Database & Message Broker
Start MongoDB and Redis using Docker:
```bash
docker-compose up -d
```
*Verify they are running by checking `docker ps`.*

---

### Step 2: Set up & Boot Node.js Express Backend
1. Open a terminal and navigate to the backend:
   ```bash
   cd backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server (automatically links to your MongoDB & Redis container):
   ```bash
   npm run dev
   ```
   *The server runs on http://localhost:5000.*

---

### Step 3: Set up & Boot Distributed Go Worker
1. Open a new terminal and navigate to the worker:
   ```bash
   cd go-worker
   ```
2. Fetch Go dependencies:
   ```bash
   go mod tidy
   ```
3. Boot the worker service:
   ```bash
   go run main.go
   ```
   *By default, this boots **5 concurrent threads** and runs in `MOCK` WhatsApp mode so you can see formatted message bodies in standard out without needing Meta credentials immediately.*

---

### Step 4: Build or Integrate the Billing UI
Mount the responsive component [**`BillingInterface.jsx`**](file:///c:/Users/Dell/Desktop/Bill-generation/frontend/src/components/BillingInterface.jsx) into your React application dashboard.
- Features dynamic search and category filters.
- Responsive cart scales cleanly to high-density smartphone screens.
- Input validation pre-screens number inputs according to WhatsApp (E.164) specification.

---


