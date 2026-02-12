# Tesla Order Tracker

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow?style=for-the-badge&logo=buymeacoffee&logoColor=white)](https://buymeacoffee.com/sven.7687)
[![GitHub](https://img.shields.io/badge/GitHub-svenger87-181717?style=for-the-badge&logo=github)](https://github.com/svenger87/tesla_order_tracker)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

A community-driven web application for tracking Tesla Model Y orders, delivery timelines, and statistics. Built with Next.js 16, React 19, and Prisma.

## Features

- **Order Tracking**: Track Tesla Model Y orders with detailed configuration information
- **Statistics Dashboard**: Visualize order trends, delivery timelines, and configuration distributions
- **Multi-Quarter Support**: Organize orders by quarter (Q1 2026, Q4 2025, Q3 2025, etc.)
- **Real-time Updates**: See when orders were last modified
- **User Highlighting**: Highlight your own order via URL parameter (`?user=yourname`)
- **Dark Mode**: Full dark mode support
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Admin Dashboard**: Manage orders, options, and settings
- **Data Import**: Import orders from Google Sheets (Excel format)

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Database**: SQLite (local) / [Turso](https://turso.tech/) (production)
- **ORM**: Prisma 7
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod validation
- **Authentication**: JWT-based admin authentication
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/svenger87/tesla_order_tracker.git
   cd tesla_order_tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local`:
   ```env
   # Database URL (for local SQLite)
   DATABASE_URL="file:./prisma/dev.db"

   # JWT Secret for admin authentication
   JWT_SECRET="your-secure-random-string-here"

   # Default admin credentials (used on first login)
   ADMIN_USERNAME="admin"
   ADMIN_PASSWORD="your-secure-password"
   ```

5. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Public Features

- **View Orders**: Browse all tracked Tesla orders organized by quarter
- **Statistics**: View charts and statistics about orders, delivery times, and configurations
- **Filtering**: Filter orders by model, country, color, drive type, and more
- **Sorting**: Click column headers to sort by any field
- **Search**: Search orders by name
- **User Highlighting**: Add `?user=yourname` to the URL to highlight your order

### Admin Features

Access the admin dashboard at `/admin/login`.

- **Manage Orders**: Edit or delete any order
- **Import Data**: Import orders from Excel/Google Sheets exports
- **Manage Options**: Configure dropdown options (countries, colors, models, etc.)
- **Settings**: Configure donation links, archive settings, and more

### Creating/Editing Orders

Users can create orders using an "edit code" system:
1. Click "Neue Bestellung" (New Order)
2. Fill in your order details
3. Set an optional edit code to protect your entry
4. Use the same edit code later to modify your order

## Deployment

### Vercel (Recommended)

1. **Link to Vercel**:
   ```bash
   vercel link
   ```

2. **Set up Turso Database** (production):
   - Create a Turso database at [turso.tech](https://turso.tech/)
   - Get your database URL and auth token
   - Add environment variables in Vercel:
     ```
     TURSO_DATABASE_URL=libsql://your-database.turso.io
     TURSO_AUTH_TOKEN=your-turso-auth-token
     JWT_SECRET=your-production-jwt-secret
     ADMIN_USERNAME=admin
     ADMIN_PASSWORD=your-secure-admin-password
     ```

3. **Deploy**:
   ```bash
   npm run deploy
   # or for preview
   npm run deploy:preview
   ```

### Quick Deploy Script

Use the included deploy script:
```bash
# Linux/macOS
./deploy.sh "Your commit message"

# Windows PowerShell
.\deploy.ps1 "Your commit message"
```

This script will:
1. Commit any changes
2. Push to GitHub
3. Deploy to Vercel

## Database

### Local Development (SQLite)

The project uses SQLite for local development. The database file is stored at `prisma/dev.db`.

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# View/edit data
npx prisma studio
```

### Production (Turso)

For production, the app uses Turso (libSQL) for edge-compatible database hosting.

1. Create a Turso database:
   ```bash
   turso db create tesla-tracker
   turso db show tesla-tracker
   ```

2. Get your credentials:
   ```bash
   turso db tokens create tesla-tracker
   ```

3. The app automatically uses Turso when `TURSO_DATABASE_URL` is set.

## Data Import

Import orders from Google Sheets:

1. Export your Google Sheet as Excel (.xlsx)
2. Place the file in the project root
3. Run the import script:
   ```bash
   npm run import:sheets
   ```

The script maps columns automatically based on German headers (Bestelldatum, Farbe, etc.).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/orders` | GET | List all orders |
| `/api/orders` | POST | Create a new order |
| `/api/orders/[id]` | PUT | Update an order |
| `/api/orders/[id]` | DELETE | Delete an order |
| `/api/options` | GET | List dropdown options |
| `/api/options` | POST | Create option (admin) |
| `/api/settings` | GET | Get app settings |
| `/api/settings` | PUT | Update settings (admin) |
| `/api/admin/login` | POST | Admin authentication |

## Project Structure

```
tesla_order_tracker/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── migrations/        # Database migrations
├── scripts/
│   └── import-from-sheets.ts  # Data import script
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── admin/         # Admin pages
│   │   └── page.tsx       # Main page
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── statistics/    # Chart components
│   │   └── admin/         # Admin components
│   ├── hooks/             # React hooks
│   └── lib/               # Utilities and types
└── public/                # Static assets
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes (local) | SQLite database path |
| `TURSO_DATABASE_URL` | Yes (prod) | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes (prod) | Turso authentication token |
| `JWT_SECRET` | Yes | Secret for JWT tokens |
| `ADMIN_USERNAME` | Yes | Default admin username |
| `ADMIN_PASSWORD` | Yes | Default admin password |

## Support the Project

If you find this project helpful, consider supporting its development:

<a href="https://buymeacoffee.com/sven.7687" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50">
</a>

Your support helps cover hosting costs and motivates continued development. Thank you!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Tesla community for tracking their orders
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Recharts](https://recharts.org/) for charting
- [Turso](https://turso.tech/) for edge database hosting
