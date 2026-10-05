# 📒 HisabKitab - Digital Khata & Udhaar Ledger Manager

**HisabKitab** is a modern, responsive, and intuitive web application designed for shopkeepers, wholesalers, and retail merchants to effortlessly track customer credit (**Udhaar**), payments received (**Jama**), customer accounts, and daily store accounting statements.

---

## ✨ Features

- 📊 **Interactive Dashboard**:
  - Live metric cards: Total Registered Customers, Total Udhaar Given, Total Jama Received, and Net Market Outstanding.
  - Quick action entries: One-click *Give Udhaar*, *Receive Jama*, and *New Customer Registration*.
  - Recent transactions overview and top debtor recovery watchlists.

- 👥 **Customer Directory & Khata Ledgers**:
  - Complete list of customers with search by name, phone, or location.
  - Filter by balance status (*All*, *Pending Balance*, *Cleared Accounts*).
  - Dedicated **Customer Khata Details** view with running balance ledger audit trail.
  - 💬 **WhatsApp Reminder Integration**: Generates instant friendly WhatsApp balance reminder messages to customers.

- 🧾 **Transactions Ledger**:
  - Full audit trail of credits and debits with invoice/receipt numbers.
  - Multi-filtering by transaction type (*Udhaar* vs *Jama*) and payment channel (*Cash*, *EasyPaisa*, *JazzCash*, *Bank Transfer*).

- 📈 **Financial Reports & Analytics**:
  - Visual 6-month comparative bar chart comparing monthly Udhaar vs. Jama turnover.
  - Credit recovery rate KPIs and merchandise category breakdown.
  - Export simulation for PDF and Excel reports.

- ⚙️ **Profile & Store Settings**:
  - Customizable store identity: Owner name, store title, business category, and contact info.
  - **Profile Picture & Avatar**: Upload custom photos with live `FileReader` preview or pick from preset merchant avatars.
  - **Store Location & Bio**: 180-character tagline and physical store address.
  - **Multi-Currency Support**: Switch between `Rs.` (PKR/INR), `$`, `€`, `AED`, `SAR`, or `£`.
  - **Live Profile Card Preview**: Real-time side card reflecting store credentials.
  - Local persistence via `localStorage`.

- 🔐 **Authentication & Security**:
  - Secure login screen with 4-digit PIN authentication and fast 1-click test demo sign-in.

---

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: Vanilla CSS (Tailored Design System with CSS Custom Properties, modern typography, glassmorphism, responsive drawers)
- **Icons & Graphics**: Inline SVG & Unicode emojis (zero heavy external icon bundle overhead)
- **Linting & Code Quality**: ESLint 10

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Iqra-skytheme/HisabKitab.git
cd HisabKitab
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the development server
```bash
npm run dev
```
Open your browser at `http://localhost:5173` to view the application.

### 4. Build for production
```bash
npm run build
```

---

## 📁 Project Architecture

```
src/
│
├── components/
│   ├── Button.jsx            # Reusable button with variants & sizes
│   ├── Header.jsx            # Sticky glass header with user profile & quick action
│   ├── Modal.jsx             # Accessible backdrop dialog with animations
│   ├── Sidebar.jsx           # Responsive navigation drawer & shop badge
│   ├── StatCard.jsx          # Dashboard KPI metric cards with trends
│   └── Table.jsx             # Reusable data table with custom column rendering
│
├── layouts/
│   └── DashboardLayout.jsx   # App shell managing sidebar, header & main viewport
│
├── pages/
│   ├── CustomerDetails.jsx   # Dedicated customer ledger statement & WhatsApp reminder
│   ├── Customers.jsx         # Customers directory with search & filters
│   ├── Dashboard.jsx         # Core business metrics & recent activity
│   ├── Login.jsx             # Shopkeeper authentication screen
│   ├── Reports.jsx           # Financial charts, recovery rate & category analytics
│   ├── Settings.jsx          # Profile picture, bio, location, currency & preferences
│   └── Transactions.jsx      # Filterable transaction ledger audit log
│
├── data/
│   └── dummyData.js          # Realistic preloaded customer & ledger records
│
├── App.jsx                   # Central state manager & persistent storage
├── index.css                 # Comprehensive design tokens & responsive CSS
└── main.jsx                  # Application entry point
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
