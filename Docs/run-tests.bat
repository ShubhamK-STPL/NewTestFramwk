@echo off
REM Run Playwright tests on Chromium and open HTML report
cd /d "%~dp0"

REM Ensure Node.js is available
where node >nul 2>&1 || (echo Node.js not found in PATH & pause & exit /b 1)

REM Install dependencies if node_modules doesn't exist or playwright isn't installed
if not exist "node_modules\@playwright\test" (
    echo Installing Playwright dependencies...
    call npm install
)

echo Checking for Playwright Chromium installation...

REM If PLAYWRIGHT_BROWSERS_PATH is set, check there first
if defined PLAYWRIGHT_BROWSERS_PATH (
	dir "%PLAYWRIGHT_BROWSERS_PATH%\chromium*" >nul 2>&1
	if %errorlevel%==0 (
		echo Playwright Chromium found in PLAYWRIGHT_BROWSERS_PATH, skipping install.
	) else (
		echo Playwright Chromium not found in PLAYWRIGHT_BROWSERS_PATH; installing Chromium...
		call npx playwright install chromium
	)
) else (
	REM Check default local cache
	dir "%LOCALAPPDATA%\ms-playwright\chromium*" >nul 2>&1
	if %errorlevel%==0 (
		echo Playwright Chromium already installed, skipping install.
	) else (
		echo Playwright Chromium not found; installing Chromium now...
		call npx playwright install chromium
	)
)

REM Allow passing the test filename as first arg, default to nl.spec.js
set TESTFILE=%1
if "%TESTFILE%"=="" set TESTFILE=farmerMilkCollectionFlow.spec.js

echo Running Playwright test %TESTFILE% (Chromium)...
call npx playwright test %TESTFILE% --headed

REM Wait a moment to ensure report is fully written
timeout /t 2 /nobreak >nul

REM Open the generated report using the reliable PowerShell script
echo.
echo Opening test report...
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File "%~dp0open-latest-report.ps1"

pause
