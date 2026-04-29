# HRMS Project

Production-oriented HRMS with Django + DRF backend and React + Tailwind frontend.

## Structure

- backend/
- frontend/

## Backend setup

1. `cd c:\Users\anish\hrms_project\backend`
2. Copy env: `Copy-Item .env.example .env`
3. Update PostgreSQL variables in `.env`:
   - `DB_NAME=hrms_db`
   - `DB_USER=hrms_user`
   - `DB_PASSWORD=strongpassword123`
   - `DB_HOST=localhost`
   - `DB_PORT=5432`
4. Ensure your PostgreSQL server is running and database/user exist.
5. Install deps: `python -m pip install -r requirements.txt`
6. Migrate: `python manage.py migrate`
7. Create admin: `python manage.py createsuperuser`
8. Run: `python manage.py runserver`

## Frontend setup

1. `cd c:\Users\anish\hrms_project\frontend`
2. Copy env: `Copy-Item .env.example .env`
3. Install deps: `npm install --legacy-peer-deps`
4. Run: `npm run dev`

## API highlights

- JWT auth: `/api/auth/login/`, `/api/auth/refresh/`, `/api/auth/logout/`, `/api/auth/me/`
- Users: `/api/users/`
- Employees: `/api/employees/`, `/api/documents/`
- Attendance: `/api/attendance/`, `/api/attendance/check_in/`, `/api/attendance/check_out/`
- Leaves: `/api/leaves/`, `/api/leaves/{id}/review/`
- Payroll: `/api/payroll/`
- Reports: `/api/reports/dashboard/`, `/api/reports/me/`, `/api/reports/attendance/`, `/api/reports/payroll/`
