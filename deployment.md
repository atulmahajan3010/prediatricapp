# Doctor Prescription App - Client Deployment Guide

This guide is for installing the offline Windows version at one clinic. The application stores clinic data in a local PostgreSQL database and does not require internet access after installation.

## What You Need

- Windows 10 or Windows 11, 64-bit
- A Windows account with permission to install software
- PostgreSQL 14 or newer
- The installer: `Doctor Prescription App Setup 2.0.2.exe`
- Optional portable application: `Doctor Prescription App 2.0.2.exe`
- A PostgreSQL administrator password
- A printer connected and working in Windows, if prescriptions will be printed

Keep the installer and database backups in a secure location. Patient data is sensitive.

## 1. Install PostgreSQL

1. Download PostgreSQL 14 or newer from the official PostgreSQL website.
2. Install the PostgreSQL Server and Command Line Tools.
3. Remember the password created for the PostgreSQL `postgres` user.
4. Keep the default PostgreSQL port `5432` unless the clinic already uses another port.
5. Confirm that the PostgreSQL service is running:
   - Open Windows Services.
   - Find a service named similar to `postgresql-x64-14`, `postgresql-x64-15`, or `postgresql-x64-16`.
   - Confirm its status is `Running` and startup type is `Automatic`.

## 2. Create the Application Database

Open **SQL Shell (psql)** or PowerShell and connect as the PostgreSQL administrator.

```sql
CREATE DATABASE doctor_app;
```

If the database already exists, do not create it again. Continue with the schema step.

## 3. Install the Database Schema

Open PowerShell in the folder containing the application files. Run:

```powershell
psql -U postgres -d doctor_app -f server\schema.sql
```

Enter the PostgreSQL password when prompted.

A successful run should complete without errors. The schema command is designed to be safe to run again when updating an existing installation.

If `psql` is not recognized, use the full path. The path may look like:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d doctor_app -f server\schema.sql
```

## 4. Configure the Application

1. Open the `.env` file installed beside `Doctor Prescription App.exe` in a text editor.
2. Set the PostgreSQL connection string. The desktop application generates and stores its private signing secret automatically; do not add `JWT_SECRET` to this file.

Example:

```env
DATABASE_URL=postgresql://postgres:YOUR_DATABASE_PASSWORD@localhost:5432/doctor_app
PORT=3001
```

Important:

- Replace `YOUR_DATABASE_PASSWORD` with the real PostgreSQL password.
- Do not share the `.env` file or place it in email, screenshots, support tickets, or source control.
- The file must be named exactly `.env` (not `.env.txt`) and must be beside the executable, not inside the PostgreSQL folder.

Place `.env` beside the installed `Doctor Prescription App.exe` for the first launch. The desktop app copies this file into its version-independent Electron user-data folder and uses that stable copy for future updates. For the portable version, place it beside the portable executable on first launch as well. Do not use an installer file or an older `win-unpacked` folder to test the configuration; build and install the current release first.

The desktop app keeps its generated signing secret in the version-independent Electron user-data folder, so updates do not invalidate existing sessions. Access tokens are renewed automatically with a refresh token; if the app is unused for more than 30 days, the doctor must log in again. The desktop app now keeps a fixed local API port, so the browser origin and stored login session remain stable across updates.

## 5. Install the Windows Application

1. Close any older copy of the application.
2. Run `Doctor Prescription App Setup 2.0.2.exe`.
3. The installer installs the application automatically for the current Windows user.
4. Save the `.env` file.
5. Start the application from the Start Menu or desktop shortcut.

For a portable installation, copy `Doctor Prescription App 2.0.2.exe` and `.env` to a permanent clinic folder, then double-click the portable executable.

PostgreSQL must be running before the application starts.

## 6. First Run

1. Confirm the application window opens.
2. Register the doctor account.
3. Complete the clinic profile.
4. Confirm the clinic name, doctor details, address, phone number, and logo.
5. Add one test patient.
6. Create and save one test prescription.
7. Open the saved prescription from history.
8. Test print preview and print one page.
9. Delete the test patient and test prescription if they are not needed.

Do not use real patient data until this checklist is successful.

## 7. Production Acceptance Checklist

Before handing the system to clinic staff, verify:

- [ ] PostgreSQL service starts automatically with Windows.
- [ ] The `doctor_app` database exists.
- [ ] `server\schema.sql` completed without errors.
- [ ] `.env` contains the correct database password.
- [ ] The application starts without a database error.
- [ ] Doctor registration and login work.
- [ ] Patient create, edit, search, and delete work.
- [ ] Visit and prescription save/edit workflows work.
- [ ] Medicines and templates work.
- [ ] Billing and queue workflows work.
- [ ] Reports and history open correctly.
- [ ] Clinic profile and logo appear correctly.
- [ ] Prescription print preview is correct.
- [ ] The clinic printer prints the expected paper size and margins.
- [ ] A backup has been created and its location is documented.
- [ ] Staff know how to close the application and keep PostgreSQL running.

## 8. Daily Use

1. Make sure the PostgreSQL service is running.
2. Start the application.
3. Use the application normally.
4. Close the application at the end of the day.
5. Do not delete or rename the PostgreSQL database.

The application runs locally. Patient data is not sent to a remote server by the offline installation.

## 9. Backups

Back up the PostgreSQL database regularly. A daily backup is recommended for an active clinic.

The application now includes **Backups** in the Operations menu. Use **Download backup file** whenever you want a complete doctor-scoped JSON backup, then use **Open Google Drive** and upload the downloaded file manually with **New -> File upload**. The app reminds you after 30 days without a successful backup. Keep downloaded files in a protected location because they contain patient data.

Create a backup folder first, then run:

```powershell
mkdir C:\ClinicBackups
pg_dump -U postgres -d doctor_app -F c -f "C:\ClinicBackups\doctor_app-YYYY-MM-DD.backup"
```

Replace `YYYY-MM-DD` with the actual date, for example `2026-09-11`.

Keep at least one backup on a separate encrypted USB drive or other protected storage. Do not keep every backup only on the application computer.

### Test a Restore

Restore backups only into a separate test database, never directly over the live database:

```sql
CREATE DATABASE doctor_app_restore_test;
```

Then run:

```powershell
pg_restore -U postgres -d doctor_app_restore_test "C:\ClinicBackups\doctor_app-YYYY-MM-DD.backup"
```

Confirm that the restored database contains patients and prescriptions before relying on the backup.

## 10. Updating the Application

Before every update:

1. Close the application.
2. Create and verify a PostgreSQL backup.
3. Keep a copy of the existing `.env` file.
4. Install the new application version.
5. Run the new `server\schema.sql` against `doctor_app` if the release notes require it.
6. Keep the existing `JWT_SECRET` unchanged. If the app asks for the `.env` on first launch, put the saved file beside the executable.
7. Start the application and complete the acceptance checklist.

If the previous release used a changing local port, its old token belongs to a different browser origin and cannot be reused automatically. Log in once after the update; later updates will preserve the session as long as the JWT secret is unchanged.

Never overwrite or delete the PostgreSQL database during an application update.

## 11. Troubleshooting

### Application does not start

- Confirm PostgreSQL is running.
- Confirm `.env` is beside the executable.
- Confirm `DATABASE_URL` uses the correct password, port, and database name.
- Check the application startup error shown by Windows.

### Database authentication failed

- Verify the PostgreSQL password.
- Test the connection:

```powershell
psql -U postgres -d doctor_app -h localhost
```

- Update `DATABASE_URL` if PostgreSQL uses a non-default port.

### Relation or column does not exist

Run the latest schema again:

```powershell
psql -U postgres -d doctor_app -f server\schema.sql
```

Restart the application afterward.

### Printer output is incorrect

- Set the correct printer as the Windows default printer.
- Confirm the printer paper size.
- Check the selected prescription template size.
- Print a test prescription before using the system for patients.

### Port already in use

The desktop application normally selects another available local port automatically. If the browser or application still cannot open, close old application processes and restart Windows. Do not expose the API port to the public network.

## 12. Support Information to Record

Keep this information with the clinic administrator, but never record passwords or JWT secrets:

- Application version
- Installation date
- Windows computer name
- PostgreSQL version
- Database name: `doctor_app`
- Backup folder and backup schedule
- Printer model and paper size
- Installer/support contact

## Security Rules

- Never share the PostgreSQL password or `.env` file.
- Never use real patient data for testing.
- Restrict Windows access to authorized clinic staff.
- Use a Windows login password and screen lock.
- Keep Windows, PostgreSQL, and the application updated.
- Test database restoration regularly.
- Store backups securely because they contain patient data.
