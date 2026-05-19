@echo off
title Exportar Proyecto Limpio
color 0B
echo ======================================================
echo    CREANDO COPIA LIMPIA DEL SISTEMA PARA OTRO EQUIPO
echo ======================================================
echo.
echo Esto copiara todo tu codigo actual (que si funciona) a una 
echo carpeta en tu Escritorio, pero SIN la base de datos vieja
echo ni los archivos pesados (node_modules).
echo.
pause

set "DESTINO=%USERPROFILE%\Desktop\FastPOS_Instalador_Limpio"
if exist "%DESTINO%" rmdir /S /Q "%DESTINO%"
mkdir "%DESTINO%"

echo.
echo Copiando archivos del sistema...
robocopy . "%DESTINO%" /E /XD node_modules .git scratch update "frontend\node_modules" /XF dev.db dev.db-journal

echo.
echo Creando instalador automatico para el otro equipo...
(
echo @echo off
echo title Instalando FastPOS en Nuevo Equipo
echo color 0A
echo echo ======================================================
echo echo    INSTALANDO FASTPOS DESDE CERO
echo echo ======================================================
echo echo.
echo echo [1/5] Instalando dependencias del Servidor...
echo call npm install
echo echo.
echo echo [2/5] Instalando y compilando el Frontend (Visual)...
echo cd frontend
echo call npm install
echo call npm run build
echo cd ..
echo echo.
echo echo [3/5] Configurando base de datos Prisma...
echo call npx prisma generate
echo call npx prisma db push
echo echo.
echo echo [4/5] Creando usuario Administrador por defecto...
echo call node seed.js
echo echo.
echo echo ======================================================
echo echo INSTALACION COMPLETADA CON EXITO.
echo echo Ya puedes abrir el programa con npm run dev o npm start
echo echo ======================================================
echo pause
) > "%DESTINO%\INSTALAR_NUEVO_EQUIPO.bat"

echo.
echo ======================================================
echo EXPORTACION TERMINADA EXITOSAMENTE.
echo ======================================================
echo Ve a tu Escritorio, busca la carpeta "FastPOS_Instalador_Limpio".
echo Esa carpeta completa es la que debes pasarle al otro equipo.
echo.
pause
