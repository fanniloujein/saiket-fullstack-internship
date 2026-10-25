# SaiKet Systems — Full Stack Development Internship

**Intern:** Loujein Fanni · **Duration:** 24/10/2026 → 24/11/2026 · **Mode:** Remote

This repository holds my work for the SaiKet Systems Full Stack Development internship. Each task has its own folder, as the program asks.

| # | Task | Folder | Stack | Status |
|---|---|---|---|---|
| 1 | Static Portfolio Website with a Theme | [`task-1-portfolio`](task-1-portfolio) | HTML · Tailwind CSS · JavaScript | ✅ Done |
| 2 | Responsive Web Page (e-commerce landing) | [`task-2-ecommerce-landing`](task-2-ecommerce-landing) | HTML · CSS · Bootstrap 5 · JavaScript | ✅ Done |
| 3 | Front-End Framework Basics (to-do app) | [`task-3-react-todo`](task-3-react-todo) | React 19 · Vite · Vitest | ✅ Done |
| 4 | Basic REST API (Users CRUD) | [`task-4-rest-api`](task-4-rest-api) | Node.js · Express 5 · Postman | ✅ Done |
| 5 | Database Integration | [`task-5-database-integration`](task-5-database-integration) | PostgreSQL · SQL · Express | ✅ Done |
| 6 | Full Stack Application (User Management) | [`task-6-fullstack-app`](task-6-fullstack-app) | React · Express · PostgreSQL · auth | ✅ Done |

## 🌐 Live demos

| Task | Live link |
|---|---|
| 3 · Bloom (React) | https://task-3-react-todo.onrender.com/ |
| 4 · Users REST API | https://npm-install-nyfu.onrender.com/ |
| 5 · API + PostgreSQL | https://saiket-users-postgres.onrender.com/ |
| 6 · Orbit (full stack) | https://orbrit.onrender.com/ (demo: `admin@orbit.demo` / `Demo1234`) |

> Hosted on Render's free plan: the first visit can take up to a minute while the service wakes up.

## Task 1: "Rhythm of the Day" portfolio

A portfolio whose theme follows the visitor's real local time (dawn, day, dusk, night), with a sun or moon moving across the sky. The site is bilingual FR/EN and responsive, and its contact form is validated in JavaScript.

![Task 1 preview](task-1-portfolio/screenshots/hero-dawn.png)

Details: [task-1-portfolio/README.md](task-1-portfolio/README.md)

## Task 2: "Fakhar" e-commerce landing page

A responsive landing page for a fictional handmade-ceramics shop from Nabeul. It has filters, search and sorting, a quick view with colour variants, a cart with a promo code and a free-shipping bar, a checkout validated in JavaScript, and a dark mode. It is built with Bootstrap 5 and vanilla JS.

![Task 2 preview](task-2-ecommerce-landing/screenshots/hero.png)

Details: [task-2-ecommerce-landing/README.md](task-2-ecommerce-landing/README.md)

## Task 3: "Bloom" React to-do list

A to-do list where every completed task grows a flower in an animated garden. You can add, edit inline and delete tasks (with undo). Tasks have categories, priorities and due dates, and the list supports filters, sorting, drag & drop and dark mode. It uses useReducer, Context, a custom hook, and has 16 tests.

![Task 3 preview](task-3-react-todo/screenshots/light.png)

Details: [task-3-react-todo/README.md](task-3-react-todo/README.md)

## Task 4: Users REST API

A CRUD API for a `User` entity (name, email, age) built with Node.js and Express 5. It has hand-written validation, correct status codes (201, 204, 400, 404, 409, 415), and search, filtering, sorting and pagination. It comes with a **Postman collection (37 assertions)**, 15 automated tests and an API explorer page.

![Task 4 preview](task-4-rest-api/screenshots/explorer-create.png)

Details: [task-4-rest-api/README.md](task-4-rest-api/README.md)

## Task 5: Database integration (PostgreSQL)

The Task 4 API now stores its users in **PostgreSQL**, using hand-written, parameterised SQL (no ORM). It has constraints (UNIQUE, CHECK), a trigger, indexes, migrations, and statistics computed with COUNT/AVG/GROUP BY. The explorer page shows the SQL executed for every request. It comes with 17 integration tests against a real database and 43 Postman assertions.

![Task 5 preview](task-5-database-integration/screenshots/explorer-select.png)

Details: [task-5-database-integration/README.md](task-5-database-integration/README.md)

## Task 6: "Orbit" full stack user management

React, Express and PostgreSQL in one application. Anyone can sign up, then view, update and delete their own profile. Administrators get a dashboard (SQL statistics, activity log) and full CRUD on every user. Login is secure: scrypt hashes, HttpOnly session cookie, user/admin roles and brute-force protection. It has 18 server tests against PostgreSQL and 9 React tests.

![Task 6 preview](task-6-fullstack-app/screenshots/dashboard.png)

Details: [task-6-fullstack-app/README.md](task-6-fullstack-app/README.md)

## How to view

Tasks 1 and 2 are static sites: open their `index.html` in a browser. Task 3 is a React app: run `npm install && npm run dev` in its folder. Task 4 is an API: run `npm install && npm start` in its folder. Tasks 5 and 6 need PostgreSQL too: see their READMEs.

Once GitHub Pages is enabled for this repository, the live version is at
`https://fanniloujein.github.io/saiket-fullstack-internship/task-1-portfolio/`.

---

#SaiKetSystems #saiket #saiketsys #SaiKetInternship
