@echo off
REM AutoGadget Docker Manager for Windows
setlocal enabledelayedexpansion

:menu
cls
echo ====================================
echo   AutoGadget Docker Manager
echo ====================================
echo.
echo 1. Start Services
echo 2. Stop Services
echo 3. Restart Services
echo 4. Rebuild Services
echo 5. Show Status
echo 6. View All Logs
echo 7. View Backend Logs
echo 8. View Database Logs
echo 9. View Nginx Logs
echo 10. Health Check
echo 11. Backup Database
echo 12. Open Frontend (Browser)
echo 13. Open Admin Panel (Browser)
echo 0. Exit
echo.
set /p choice="Select option (0-13): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto restart
if "%choice%"=="4" goto rebuild
if "%choice%"=="5" goto status
if "%choice%"=="6" goto logs_all
if "%choice%"=="7" goto logs_backend
if "%choice%"=="8" goto logs_db
if "%choice%"=="9" goto logs_nginx
if "%choice%"=="10" goto health
if "%choice%"=="11" goto backup
if "%choice%"=="12" goto open_frontend
if "%choice%"=="13" goto open_admin
if "%choice%"=="0" goto end

echo Invalid option!
pause
goto menu

:start
echo Starting services...
if not exist .env (
    echo WARNING: .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo Please edit .env file and set secure passwords!
    pause
)
docker-compose up -d
echo.
echo Services started successfully!
pause
goto menu

:stop
echo Stopping services...
docker-compose down
echo.
echo Services stopped!
pause
goto menu

:restart
echo Restarting services...
docker-compose restart
echo.
echo Services restarted!
pause
goto menu

:rebuild
echo Rebuilding services...
docker-compose down
docker-compose up -d --build
echo.
echo Services rebuilt and started!
pause
goto menu

:status
echo Service Status:
echo.
docker-compose ps
echo.
pause
goto menu

:logs_all
echo Viewing all logs (Ctrl+C to exit)...
echo.
docker-compose logs -f
pause
goto menu

:logs_backend
echo Viewing backend logs (Ctrl+C to exit)...
echo.
docker-compose logs -f backend
pause
goto menu

:logs_db
echo Viewing database logs (Ctrl+C to exit)...
echo.
docker-compose logs -f postgres
pause
goto menu

:logs_nginx
echo Viewing nginx logs (Ctrl+C to exit)...
echo.
docker-compose logs -f nginx
pause
goto menu

:health
echo Running health check...
echo.
echo Checking backend...
curl -s http://localhost:3000/api/health
echo.
echo.
echo Checking frontend...
curl -s -I http://localhost | findstr "200"
if errorlevel 1 (
    echo Frontend: NOT RESPONDING
) else (
    echo Frontend: OK
)
echo.
echo Checking database...
docker-compose exec -T postgres pg_isready -U autogadget_user
if errorlevel 1 (
    echo Database: NOT RESPONDING
) else (
    echo Database: OK
)
echo.
pause
goto menu

:backup
echo Creating database backup...
set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set backup_file=backup_%timestamp%.sql
echo.
docker-compose exec -T postgres pg_dump -U autogadget_user autogadget > %backup_file%
if errorlevel 1 (
    echo Backup FAILED!
) else (
    echo Backup created: %backup_file%
)
echo.
pause
goto menu

:open_frontend
echo Opening frontend in browser...
start http://localhost
goto menu

:open_admin
echo Opening admin panel in browser...
start http://localhost/admin
goto menu

:end
echo Goodbye!
exit /b 0
