# Lisa's Lashes

### Full-stack salon management & e-commerce platform

A full-stack application built from scratch with **NestJS, TypeScript, PostgreSQL and Prisma**, combining customer-facing functionality with booking, e-commerce and administration systems.

**Live Demo:** https://lisa-lashes-production.up.railway.app/

---

## ✨ Overview

Lisa's Lashes is a real-world style salon platform developed as a practical software engineering project.

The application combines:

| Area              | Functionality                                    |
| ----------------- | ------------------------------------------------ |
| 📅 Booking        | Services, resources, availability and scheduling |
| 🛍️ E-commerce    | Products, cart, orders, stock and discounts      |
| 💳 Payments       | Stripe payment integration                       |
| 👤 Accounts       | Authentication, profiles and user management     |
| ⭐ Reviews         | Product/service reviews and moderation           |
| 🎓 Courses        | Courses and course bookings                      |
| 🖼️ Content       | Gallery, about sections and product content      |
| ⚙️ Administration | Management interface for application data        |

---

## 🏗️ Architecture

The backend follows a **modular monolith** architecture, with application functionality separated into NestJS feature modules.

```text
                  ┌─────────────────────┐
                  │   Customer Frontend │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │      NestJS API     │
                  │                     │
                  │ Auth / Users        │
                  │ Booking / Schedule  │
                  │ Products / Cart     │
                  │ Orders / Payments   │
                  │ Reviews / Content   │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │     Prisma ORM      │
                  └──────────┬──────────┘
                             │
                  ┌──────────▼──────────┐
                  │ PostgreSQL / Supabase│
                  └─────────────────────┘
```

The application is deployed as a single backend rather than being split into microservices.

---

## 🔐 Authentication & Security

* JWT-based authentication
* Passport integration
* Role-based authorization
* bcrypt password hashing
* DTO-based request validation
* Request throttling
* HTML/content sanitization
* Protected administrative routes
* Environment-based secret configuration

---

## 📅 Booking & Scheduling

The booking system supports:

* Salon services with configurable duration and pricing
* Multiple resources/artists
* Resource-service relationships
* Working hours
* Schedule overrides
* Booking status management
* User-linked and guest bookings
* Course bookings

The scheduling system was also an area where I gained experience with the challenges of maintaining consistency when multiple users interact with the same availability data.

---

## 🛒 E-commerce

The e-commerce system includes:

* Product catalogue
* Product types/categories
* Product images and content sections
* Shopping carts
* Stock management
* Orders and order items
* Promotional discounts
* Stripe integration
* Saved payment-method metadata
* Historical purchase prices
* PDF receipt generation

The database stores the price paid for each order item independently from the current product price, allowing historical orders to remain accurate after product prices change.

---

## 🗄️ Database

PostgreSQL is used as the primary database through **Prisma ORM**, with the database hosted on Supabase.

The schema contains relational models for users, addresses, payment methods, bookings, resources, services, products, carts, orders, reviews, courses, promotions and website content.

Examples of database design include:

* Foreign-key relationships with deliberate delete behaviour
* Composite unique constraints
* Many-to-many resource/service relationships
* User-owned carts and orders
* Decimal types for monetary values
* Historical order pricing
* Database enums for application states
* Cascading relationships where appropriate

The schema was developed iteratively while learning relational database design. Areas such as indexing, query optimization, database-level constraints and concurrency handling remain opportunities for further improvement.

---

## 🧪 Testing & Performance

The project includes Jest unit tests, end-to-end testing infrastructure and dedicated **Artillery load-testing experiments**.

The purpose of the stress tests was not to simulate a normal number of users, but to deliberately push the API under extreme concurrent load and identify bottlenecks.

### Deployed environment

| Metric                |        Result |
| --------------------- | ------------: |
| Virtual users created |    **42,450** |
| HTTP requests         |    **63,624** |
| Successful responses  |    **31,761** |
| Request rate          | **286 req/s** |
| Overall p50           |   **59.7 ms** |
| Overall p95           |  **104.6 ms** |
| Overall p99           |  **183.1 ms** |
| Overall p99.9         |  **837.3 ms** |
| `/products/shop` p99  |  **202.4 ms** |
| `/about/public` p99   |  **179.5 ms** |
| `/gallery/public` p99 |  **172.5 ms** |

The deployed test exposed a clear limitation: `/products/shop` experienced **31,863 socket timeouts** under the test conditions, while the other tested endpoints continued responding successfully.

### Local environment

| Metric                 |        Result |
| ---------------------- | ------------: |
| Virtual users created  |    **54,450** |
| HTTP requests          |   **158,528** |
| Successful responses   |   **156,116** |
| Request rate           | **729 req/s** |
| HTTP 5xx responses     |         **1** |
| Overall p50            |      **1 ms** |
| Overall p95            |  **804.5 ms** |
| Overall p99            |    **1.13 s** |
| Overall p99.9          |    **5.27 s** |
| `/products/shop` p99   |    **2.42 s** |
| `/products/shop` p99.9 |    **7.26 s** |
| `/about/public` p99    |    **8.9 ms** |
| `/gallery/public` p99  |    **8.9 ms** |

### Findings

The tests showed that the application can handle substantial request volume, but also exposed `/products/shop` as a significant bottleneck under extreme concurrency.

This provides concrete areas for future investigation, including:

* Prisma query structure
* Database indexes
* Relation loading
* Response size
* Connection pooling
* Pagination and query optimization

The tests were primarily used as an engineering diagnostic rather than as a claim of production capacity.

---

## 🧰 Technology Stack

### Backend

* TypeScript
* Node.js
* NestJS
* Prisma ORM
* PostgreSQL
* JWT / Passport
* Jest / Supertest

### Infrastructure

* Supabase
* Stripe
* Docker
* Railway

### Supporting libraries

* bcrypt
* class-validator / class-transformer
* PDFKit
* Multer
* DOMPurify / sanitize-html
* cache-manager
* @nestjs/throttler

---

## 📁 Project Structure

```text
src/
├── auth/
├── user/
├── account/
├── booking/
├── schedule/
├── service/
├── resource/
├── products/
├── product_types/
├── product_sections/
├── product_discounts/
├── cart/
├── orders/
├── receipt/
├── reviews/
├── courses/
├── courses-bookings/
├── gallery/
├── about/
├── promo/
├── profile/
├── database/
└── health/
```

Each major application domain is separated into its own NestJS module, with controllers, services, DTOs and tests where applicable.

---

## 🚀 Running Locally

### Requirements

* Node.js
* PostgreSQL
* npm/pnpm
* Required environment variables

### Installation

```bash
git clone ADD_REPOSITORY_URL
cd lisa-lashes-ts
npm install
```

Configure the required environment variables, then generate the Prisma client:

```bash
npx prisma generate
```

Start the development server:

```bash
npm run start:dev
```

---

## 🔑 Environment Variables

Example configuration:

```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
STRIPE_SECRET_KEY=
```

Additional variables may be required depending on the enabled functionality.

**Never commit real credentials or secrets to the repository.**

---

## 📌 Project Status

Lisa's Lashes is considered **complete for its current portfolio scope** and is no longer under active feature development.

There are still areas that could be improved to move the application closer to a production-oriented system, particularly database indexing, query optimization, booking concurrency, observability and deployment workflows.

However, instead of continuing to optimize the same application indefinitely, I am using the experience gained here to work on projects involving different technologies and engineering problems.

---

## 📚 What I Learned

This was one of my first substantial projects involving a real backend, relational database and deployment.

It gave me practical experience with:

* Relational PostgreSQL database design
* Prisma ORM
* Modular NestJS architecture
* Authentication and authorization
* Booking and scheduling logic
* E-commerce systems
* Payment integration
* API validation and security
* Automated testing
* Load testing and performance analysis
* Docker and cloud deployment

The project also showed me where my initial database and backend knowledge was limited. Working through those limitations gave me practical experience with indexing, concurrency, query performance, data integrity and the trade-offs involved in larger applications.

The project is now primarily a demonstration of what I built and learned from it, while newer projects allow me to explore different areas of software engineering.
nestjs/nest/blob/master/LICENSE).
