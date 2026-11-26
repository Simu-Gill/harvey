# Hostinger Cloud deployment

This application deploys as a private Next.js web app backed by Hostinger MySQL/MariaDB. The production database intentionally starts empty. The first and only initial user is created securely from `/setup` after deployment.

## Hostinger build settings

- Framework: Next.js
- Node.js: 22.x
- Package manager: npm
- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm start`

The production build generates the MySQL Prisma client, applies committed migrations, and builds Next.js. Local development continues to use SQLite through `npm run dev` and `npm run build:local`.

## Required environment variables

Add these in the Hostinger application dashboard. Never commit their values.

- `DATABASE_URL` — `mysql://USER:PASSWORD@127.0.0.1:3306/DATABASE`
- `NEXTAUTH_URL` — the final HTTPS application URL, without a trailing slash
- `NEXTAUTH_SECRET` — a unique random value of at least 32 bytes
- `NODE_ENV` — `production`

## First deployment

1. Create a new MySQL database and user in Hostinger.
2. Add all environment variables before running the first build.
3. Deploy the private Git repository.
4. Open `/setup` on the deployed domain.
5. Create the Super Admin account.
6. Confirm `/setup` redirects to `/login` after the account exists.
7. Sign in and verify the empty dashboard before entering live data.

No demo clients, loans, payments, local database files, or local secrets are included in Git or deployed.

## Production verification

- HTTPS is active and HTTP redirects to HTTPS.
- Login, logout and password reset work.
- Super Admin can create an Owner, Partner and Partner user.
- Partner users see only assigned clients and can only add loans and payments.
- Currency displays as RM throughout the application.
- Database backups are enabled before live records are entered.
