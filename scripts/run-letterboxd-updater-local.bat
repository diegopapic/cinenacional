@echo off
chcp 65001 >nul
setlocal

set LOGFILE=C:\Users\diego\cinenacional\logs\letterboxd-updater.log

cd /d C:\Users\diego\cinenacional

:: Crear directorio de logs si no existe
if not exist logs mkdir logs

:: Log de inicio
echo [%date% %time%] === INICIO === >> "%LOGFILE%"

:: Abrir túnel SSH en background usando OpenSSH (ruta absoluta)
echo [%date% %time%] Abriendo tunel SSH... >> "%LOGFILE%"
start /b "" "C:\Windows\System32\OpenSSH\ssh.exe" -N -L 5433:localhost:5432 -i C:\Users\diego\.ssh\hetzner-nuevo -p 22 -o StrictHostKeyChecking=no -o BatchMode=yes root@5.161.58.106

:: Esperar a que se establezca el túnel
timeout /t 5 /nobreak >nul

:: Verificar que el túnel está activo
netstat -an | findstr "5433" >nul 2>&1
if %errorlevel% neq 0 (
    echo [%date% %time%] ERROR: Tunel SSH no se establecio >> "%LOGFILE%"
    goto :cleanup
)
echo [%date% %time%] Tunel SSH establecido >> "%LOGFILE%"

:: Ejecutar el script (muestra en pantalla Y graba en log)
echo [%date% %time%] Iniciando actualizacion de popularidad
echo [%date% %time%] Iniciando actualizacion de popularidad >> "%LOGFILE%"
powershell -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'; C:\Users\diego\cinenacional\node_modules\.bin\tsx.CMD C:\Users\diego\cinenacional\scripts\letterboxd\update-popularity-daily.ts 2>&1 | Tee-Object -Append -FilePath '%LOGFILE%'"
echo [%date% %time%] Finalizado con codigo %errorlevel% >> "%LOGFILE%"

:cleanup
:: Cerrar el túnel SSH
taskkill /f /im ssh.exe >nul 2>&1
echo [%date% %time%] === FIN === >> "%LOGFILE%"

endlocal
