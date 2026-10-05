# HisabKitab - Complete Working Frontend + Backend

This package contains the existing HisabKitab frontend and its MongoDB-backed Express backend in separate folders.

## Folder structure

- `Frontend/` - existing React/Vite UI with API connectivity and WhatsApp direct-number reminders.
- `Backend/` - Node.js/Express/Mongoose/JWT API.

## Requirements

- Node.js 20+ recommended (your Node 24.18.0 is supported by the project packages).
- MongoDB running locally or a MongoDB Atlas connection.

## 1. Start Backend

Open PowerShell in `Backend`:

```powershell
npm install
```

Optional: copy `.env.example` to `.env` and set your MongoDB/JWT values. The backend defaults to the local URI below when `MONGODB_URI` is not supplied:

`mongodb://127.0.0.1:27017/hisabkitab`

Then:

```powershell
npm run dev
```

API: `http://localhost:5000`

## 2. Start Frontend

Open a second PowerShell in `Frontend`:

```powershell
npm install
npm run dev
```

Frontend: `http://localhost:5173`

The frontend defaults to `http://localhost:5000/api`. To override it, create `Frontend/.env` from `.env.example` and set `VITE_API_URL`.

## Fresh database login

If the MongoDB database is new, the backend creates the owner automatically:

- Phone: `0300-1234567`
- PIN: `1234`

The login accepts the phone with the `+92` country code shown in the UI or the owner email.

If you already have an existing HisabKitab database, do not delete it. The existing owner account remains the account used for that data.

## EmailJS

EmailJS credentials can be entered in Settings. They are stored both locally for the current browser and in the MongoDB shop settings so transaction emails continue working after refresh/relogin. Keep the EmailJS template's **To Email** field as `{{recipient_email}}`.

## WhatsApp reminders

Customer and supplier WhatsApp Reminder buttons now open WhatsApp directly for that saved phone number and prefill the reminder message. The phone number is normalized to international format for `wa.me`.

## Important

- Do not commit `.env` files.
- Do not run `npm audit fix --force` before testing the application.
- Do not delete the MongoDB database when replacing the application source.
