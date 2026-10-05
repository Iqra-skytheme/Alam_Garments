# HisabKitab - Frontend + Backend

The UI remains the existing HisabKitab design. Data is loaded from the Express/MongoDB backend.

## Start backend

From `Backend`:

```powershell
npm install
npm run dev
```

## Start frontend

From `Frontend`:

```powershell
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:5000

The frontend uses `VITE_API_URL` when provided and otherwise defaults to `http://localhost:5000/api`.
