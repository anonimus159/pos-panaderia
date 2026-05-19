@echo off
title POS Panaderia
color 0E
echo ===================================================
echo             Iniciando POS Panaderia
echo ===================================================

echo.
echo Iniciando el sistema completo (Frontend y Backend al mismo tiempo)...
start "POS Panaderia" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ¡Listo! Se ha abierto una ventana de comandos que administrara todo el POS.
echo NOTA: No cierres la ventana negra mientras estes usando el sistema.
echo.
pause
