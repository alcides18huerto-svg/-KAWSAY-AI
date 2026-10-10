# stop-all.ps1
# Detiene el backend y ambos frontends liberando sus puertos.
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\stop-all.ps1

$ports = @(8000, 5173, 5174)

foreach ($port in $ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($connections) {
    foreach ($conn in $connections) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Detenido proceso en el puerto $port (PID $($conn.OwningProcess))" -ForegroundColor Yellow
    }
  }
}

Write-Host "Servicios detenidos." -ForegroundColor Green
