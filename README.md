# Equip Tracker

create a Online Equipment Borrowing and Return MonitoringSystem Using Supabase                Prompt 1 – Auth + shell              "Build a login page using Supabase email/password auth. After login, show a dashboard layout with a top nav (Equipment, Transactions, Logout) and a logout button that ends the session and redirects to login."

Prompt 2 – Dashboard

"On the dashboard, show 5 summary cards: Total Equipment, Available, Borrowed, Returned Transactions, Overdue. Pull these counts live from the equipment and borrow_transactions tables in Supabase."

Prompt 3 – Equipment CRUD

"Add an Equipment page with a table listing equipment_name, category, asset_code, condition, availability. Add a form to create new equipment (fields: name, category, asset code, condition, availability defaults to Available). Support edit and delete with a confirmation dialog before delete. Enforce: equipment_name required, asset_code must be unique."

Prompt 4 – Borrowing

"Add a 'New Borrowing Transaction' form with borrower_name, borrower_type (dropdown: Student/Faculty/Staff), department, an equipment dropdown showing only equipment where availability = 'Available', date_borrowed (default today), and due_date. On submit: due_date must not be before date_borrowed. Insert into borrow_transactions with status 'Borrowed', and update the chosen equipment's availability to 'Borrowed'."

Prompt 5 – Return + overdue

"On the Transactions list, add a 'Return Equipment' button for rows with status Borrowed or Overdue. On click: set date_returned to today, status to 'Returned', and set the related equipment's availability back to 'Available'. Don't allow returning a transaction that's already Returned. Also, for any transaction where due_date is before today and status is not Returned, display its status as Overdue (compute this client-side when rendering, don't just rely on the stored status)."

Prompt 6 – Search & filter

"Add a search box on Equipment (search by name or asset code) and on Transactions (search by borrower name). Add filter dropdowns: Equipment availability (All/Available/Borrowed) and Transaction status (All/Borrowed/Returned/Overdue)."

Prompt 7 (optional bonus)

"When a user clicks an equipment row, show a history panel listing all past borrow_transactions for that equipment_id (borrower, dates, status), pulled live from Supabase."    Use my supabase credentials                                                              SUPABASE_URL=https://vpxlvdepsdkyzmaajxnh.supabase.co                                                        SUPABASE_PUBLISHABLE_KEY=sb_publishable_hGm2UF5g0pCfIO2EufTH2Q_

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://equip-flow-friend.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7fef9bc9-b2a0-4aeb-8417-e2eb19d71163).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
