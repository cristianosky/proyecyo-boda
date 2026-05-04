@echo off
title Boda Jeifry ^& Karen — Servidor
cd /d "%~dp0"

:inicio
echo.
echo ============================================
echo   Boda Jeifry ^& Karen — Servidor local
echo ============================================
echo.

:: Liberar puerto 3001 si ya está ocupado
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    echo Liberando puerto 3001 ^(PID %%a^)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Iniciando...
echo.
node src/app.js

echo.
echo ============================================
echo  El servidor se detuvo inesperadamente.
echo  Reiniciando en 3 segundos... ^(Ctrl+C para salir^)
echo ============================================
timeout /t 3 /nobreak >nul
goto inicio
