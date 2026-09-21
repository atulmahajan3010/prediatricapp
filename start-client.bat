@echo off
setlocal

set "PROJECT_DIR=%~dp0"

if not exist "%PROJECT_DIR%\package.json" (
  echo Project folder was not found:
  echo %PROJECT_DIR%
  echo.
  echo Edit PROJECT_DIR near the top of this batch file.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

title Doctor Prescription App Launcher

set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME_EXE%" (
  echo Google Chrome was not found in the standard installation locations.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 18 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist ".env" (
  echo Missing .env file.
  echo Copy .env.example to .env and set DATABASE_URL and JWT_SECRET first.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Frontend dependencies are missing. Installing them now...
  call npm install
  if errorlevel 1 (
    echo Frontend dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "server\node_modules" (
  echo API dependencies are missing. Installing them now...
  pushd server
  call npm install
  if errorlevel 1 (
    popd
    echo API dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

echo Building the latest frontend application...
call npm run build
if errorlevel 1 (
  echo Frontend build failed. The application will not be started.
  pause
  exit /b 1
)

echo Starting Doctor Prescription API on http://localhost:3001...
start "Doctor Prescription API" /D "%PROJECT_DIR%" cmd /k node server\index.js

echo Starting clinic application on http://localhost:4173...
start "Doctor Prescription App" /D "%PROJECT_DIR%" cmd /k npm run preview -- --host 127.0.0.1 --port 4173

start "" "%CHROME_EXE%" http://localhost:4173/
echo.
echo The application is starting in your browser.
echo Keep both command windows open while using the application.
echo Close those windows when finished.
exit /b 0
