# HouseHub

An app that organizes shared homes by keeping track of who cleans and who buys shared supplies, ensuring everything stays fair and clear.

## What is HouseHub?
Shared houses struggle with tracking who cleans and who buys shared supplies — it gets unfair and unclear. HouseHub solves this by automatically rotating responsibilities and keeping a clear history of exactly who has done what.

## Live App
https://gethousehub.vercel.app

## How it works
1. One person creates the house and gets a 6-digit code.
2. They share the code with housemates.
3. Everyone joins using the code.
4. The app tracks the cleaning rotation and supply purchases automatically.
5. Everyone always knows whose turn it is.

## Features
- Custom house name
- Up to 20 members
- Flexible supply items (choose from suggestions or add your own)
- Optional cleaning schedule (weekly/biweekly/monthly, any day of the week)
- Per-item supply rotation with next buyer always visible
- One-tap logging with 5-second undo
- Real-time sync across all devices
- Full history per member
- Session persistence (refresh stays on dashboard)
- Native share sheet with pre-written invite message
- No accounts or passwords needed — just a 6-digit code

## Tech Stack
- React
- TypeScript
- Vite
- Tailwind CSS
- Supabase (PostgreSQL + Realtime + RLS)

## Database Schema
- **houses:** Stores house name and the unique 6-digit code.
- **members:** Stores member names associated with a house.
- **clean_records:** History logs of completed cleaning tasks.
- **purchases:** History logs of supply purchases.
- **supply_responsibilities:** Tracks who is assigned to buy which item next.
- **house_settings:** Stores house configuration like active supplies and cleaning rules.

## Local Development
```bash
npm install
npm run dev
```

## Environment Variables
A `.env` file is required in the root directory with the following variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key

## Project Structure
- `src/components/househub/`: Core UI components (Dashboard, Tabs, Wizard, etc.)
- `src/services/`: Supabase database logic and API calls
- `src/lib/`: Shared utilities, types, and logic (rotation algorithms, etc.)
- `src/pages/`: Top-level page components (Index)

---
*Built for real shared houses. Simple, fair, organized living.*
