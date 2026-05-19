@echo off
title Actualizador de FastPOS Enterprise v2.2
color 0A
echo ======================================================
echo    MANTENIMIENTO Y ACTUALIZACION - FastPOS Enterprise
echo ======================================================
echo.
echo Este script sincronizara los ultimos cambios del sistema:
echo [+] Devoluciones: Restauracion automatica de STOCK en cancelaciones
echo [+] Interfaz: Nuevas alertas y advertencias de estilo PREMIUM
echo [+] Categorias: Reasignacion inteligente a "General"
echo [+] Pedidos: Cancelacion de items con autorizacion Admin
echo [+] Filtros: Ordenamiento por A-Z y Precio en todo el sistema
echo [+] Moneda: Formato estandarizado COP ($ 15.000 COP)
echo.
echo Presiona una tecla para iniciar el proceso...
pause > nul

echo.
echo [PASO 0] Descargando actualizaciones de GitHub...
call git pull origin main

echo.
echo [PASO 1] Actualizando dependencias del Backend...
call npm install

echo.
echo [PASO 2] Actualizando dependencias del Frontend...
cd frontend
call npm install
cd ..

echo.
echo [PASO 3] Regenerando Prisma Client...
call npx prisma generate

echo.
echo [PASO 4] Verificando integridad de la base de datos (Prisma DB Push)...
call npx prisma db push

echo.
echo ======================================================
echo    SISTEMA ACTUALIZADO CORRECTAMENTE (Versión 2.2)
echo ======================================================
echo Comando para iniciar en Desarrollo: npm run dev
echo Comando para Produccion: npm start
echo.
pause
