# 2-test-extension.ps1 — Super Video Popup
# ─────────────────────────────────────────────────────────────────────────
# Deja la extensión lista para probar de un solo comando:
#
#   1. Abre Chrome/Edge en un perfil de pruebas AISLADO en %TEMP% (no toca
#      tu perfil ni tus sesiones habituales).
#   2. Activa "Developer mode" automáticamente (Chrome ya no acepta
#      extensiones descomprimidas sin esto).
#   3. Carga Super Video Popup con el método oficial del DevTools Protocol
#      (Extensions.loadUnpacked) — el reemplazo moderno de --load-extension,
#      que Chrome empezó a ignorar si Developer mode está apagado.
#   4. Abre una página con video (o la URL que le pases) para que pruebes directo.
#
# Uso:
#   powershell -File scripts\2-test-extension.ps1
#   powershell -File scripts\2-test-extension.ps1 https://example.com/

param(
    [string]$Url = 'https://www.w3schools.com/html/mov_bbb.mp4'
)

$ErrorActionPreference = 'Stop'

$RootDir = Split-Path -Parent $PSScriptRoot
$ProfileDir = Join-Path $env:TEMP 'super-video-popup-test-profile'
$Port = 9333

if (-not (Test-Path (Join-Path $RootDir 'manifest.json'))) {
    Write-Error "No se encontró manifest.json en $RootDir"
}

# ── 1. Encontrar un navegador basado en Chromium ────────────────────────
$Candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Chromium\Application\chrome.exe"
)
$Browser = $Candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if (-not $Browser) {
    Write-Error "No se encontró Chrome/Edge instalado en las rutas habituales. Instala Chrome y vuelve a intentar."
}

# ── 2. Encontrar Python (necesario para automatizar la carga por CDP) ───
$Python = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        $Python = $cmd
        break
    }
}
if (-not $Python) {
    Write-Error "Se necesita Python para automatizar la carga (no se encontró 'python'/'python3'/'py' en PATH)."
}

# ── 3. Perfil siempre fresco ─────────────────────────────────────────────
# Evita acumular recargas duplicadas de la extensión entre corridas y
# garantiza un estado predecible.
Get-CimInstance Win32_Process -Filter "Name='chrome.exe' OR Name='msedge.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($ProfileDir) } |
    ForEach-Object {
        try { Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop } catch {}
    }
Start-Sleep -Milliseconds 500

if (Test-Path $ProfileDir) {
    Remove-Item -Recurse -Force $ProfileDir
}
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

Write-Output "Navegador: $Browser"
Write-Output "Extensión: $RootDir"
Write-Output "Perfil de pruebas: $ProfileDir (aislado, no afecta tu perfil normal)"
Write-Output ""

# ── 4. Abrir el navegador con depuración remota ─────────────────────────
Start-Process -FilePath $Browser -ArgumentList @(
    "--user-data-dir=$ProfileDir",
    "--remote-debugging-port=$Port",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank"
) | Out-Null

Write-Output "Chrome abriéndose... activando Developer mode e instalando la extensión..."

# ── 5. Automatizar la carga vía CDP (script compartido con la versión .sh) ──
$LoaderScript = Join-Path $PSScriptRoot '_cdp_loader.py'
& $Python $LoaderScript $Port $RootDir $Url
$LoaderExitCode = $LASTEXITCODE

Write-Output ""
if ($LoaderExitCode -eq 0) {
    Write-Output "Listo. Super Video Popup está instalada y activa en esta ventana de Chrome."
    Write-Output "Dale play al video y abre el popup (icono de la barra de extensiones) para activar el Picture-in-Picture."
} else {
    Write-Output "No se pudo automatizar la instalación (ver error arriba)."
    Write-Output "Puedes hacerlo a mano: en la ventana que se abrió, ve a chrome://extensions,"
    Write-Output "activa 'Developer mode' y usa 'Cargar descomprimida' seleccionando:"
    Write-Output "  $RootDir"
    exit 1
}
