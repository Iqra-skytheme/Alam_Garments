# HisabKitab Backend

Node.js + Express + MongoDB + Mongoose + JWT backend for the existing HisabKitab frontend.

## Run

1. Ensure MongoDB is running locally.
2. Copy `.env.example` to `.env` (the backend also defaults to the local MongoDB URI if `.env` is missing).
3. `npm install`
4. `npm run dev`

API: `http://localhost:5000/api`

Default owner on a fresh database:
- Phone: `0300-1234567` (with country code `+92` in the UI)
- PIN: `1234`

Do not commit `.env`.
