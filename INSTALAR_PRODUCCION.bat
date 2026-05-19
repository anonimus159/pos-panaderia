@echo off
title Instalador de Produccion - FastPOS Enterprise
echo ======================================================
echo    INSTALADOR DE PRODUCCION - FastPOS Enterprise
echo ======================================================
echo.
echo Este script compilara la version final para el cliente.
echo.
pause

echo.
echo [1/3] Instalando dependencias...
call npm install
cd frontend
call npm install

echo.
echo [2/3] Compilando Interfaz de Usuario (Build)...
call npm run build
cd ..

echo.
echo [3/3] Preparando base de datos...
call npx prisma generate

echo.
echo ======================================================
echo    INSTALACION LISTA PARA PRODUCCION
echo ======================================================
echo Para iniciar el sistema: npm start
echo.
pause
