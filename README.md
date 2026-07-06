# Personal Finance Management Dashboard

A modern, premium Personal Finance Management Web Application built with React, TypeScript, Tailwind CSS, Recharts, Express, and SQLite.

## Features

- **Dashboard**: High-level financial overview, savings rate, and AI Insights.
- **Transactions Management**: Add, view, filter, and track income/expenses.
- **Excel Import**: Drag & Drop Excel (.xlsx, .csv) bank statements, preview data, and import directly into the database.
- **Charts & Analytics**: Interactive charts using Recharts for categorical breakdown and cash flow.
- **Dark Mode Support**: Beautiful premium glassmorphism dark theme.

## Architecture

- `client/`: React + Vite + TypeScript frontend.
- `server/`: Node.js + Express + SQLite backend.

## Prerequisites

- Node.js (v18+ recommended)
- npm or yarn

## Setup Instructions

### 1. Backend Setup

Open a terminal and navigate to the `server` directory:

```bash
cd server
npm install
npm run dev
```

This will initialize the SQLite database (`database.sqlite`) and start the API server on `http://localhost:5000`.

### 2. Frontend Setup

Open a new terminal and navigate to the `client` directory:

```bash
cd client
npm install
npm run dev
```

This will start the Vite React application on `http://localhost:5173`.

## Sample Data

To see the dashboard in action:
1. Ensure the server is running.
2. Go to the **Import Data** tab in the client.
3. Upload any sample Excel file with columns: `Date`, `Amount`, `Description`, `Category`.
4. Click "Confirm Import".
5. Return to the Dashboard to see your populated charts!

## Technologies

- **Frontend UI**: Tailwind CSS v3, Lucide React (Icons)
- **Data Vis**: Recharts
- **Excel Parsing**: SheetJS (xlsx)
- **Database**: SQLite3 (Local file-based database for zero setup)
