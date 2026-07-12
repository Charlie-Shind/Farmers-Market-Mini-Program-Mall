# Build and package backend + admin for Baota deployment
# Run from project root:
#   powershell -ExecutionPolicy Bypass -File deploy/scripts/build-release.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$ReleaseDir = Join-Path $Root 'release'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

Write-Host "Project root: $Root"

Write-Host "`n[1/4] Building backend..."
Push-Location (Join-Path $Root 'backend')
if (-not (Test-Path 'node_modules')) { npm install }
npm run prisma:generate
npm run build
Pop-Location

Write-Host "`n[2/4] Building admin..."
Push-Location (Join-Path $Root 'admin')
if (-not (Test-Path 'node_modules')) { npm install }
$env:VITE_API_BASE = '/api/admin'
$env:VITE_ADMIN_BASE = '/admin'
$env:ADMIN_BASE = '/admin/'
npm run build:prod
Pop-Location

Write-Host "`n[3/4] Preparing release folders..."
if (Test-Path $ReleaseDir) { Remove-Item $ReleaseDir -Recurse -Force }
$BackendRelease = Join-Path $ReleaseDir 'backend'
$AdminRelease = Join-Path $ReleaseDir 'admin'
New-Item -ItemType Directory -Path $BackendRelease -Force | Out-Null
New-Item -ItemType Directory -Path $AdminRelease -Force | Out-Null

Write-Host "`n[4/4] Copying artifacts..."
$BackendSrc = Join-Path $Root 'backend'
@('dist', 'prisma', 'package.json', 'package-lock.json', 'prisma.config.ts') | ForEach-Object {
    Copy-Item (Join-Path $BackendSrc $_) -Destination (Join-Path $BackendRelease $_) -Recurse -Force
}
Copy-Item (Join-Path $Root 'deploy/baota/backend.env.production.example') (Join-Path $BackendRelease '.env.example') -Force
Copy-Item (Join-Path $Root 'deploy/baota/ecosystem.config.cjs') (Join-Path $BackendRelease 'ecosystem.config.cjs') -Force
Copy-Item (Join-Path $Root 'admin/dist/*') -Destination $AdminRelease -Recurse -Force
Copy-Item (Join-Path $Root 'deploy/baota') (Join-Path $ReleaseDir 'baota-docs') -Recurse -Force

$ZipBackend = Join-Path $Root "release-backend-$Timestamp.zip"
$ZipAdmin = Join-Path $Root "release-admin-$Timestamp.zip"
if (Test-Path $ZipBackend) { Remove-Item $ZipBackend -Force }
if (Test-Path $ZipAdmin) { Remove-Item $ZipAdmin -Force }
Compress-Archive -Path $BackendRelease -DestinationPath $ZipBackend -Force
Compress-Archive -Path $AdminRelease -DestinationPath $ZipAdmin -Force

Write-Host "`nDone."
Write-Host "  backend dir : $BackendRelease"
Write-Host "  admin dir   : $AdminRelease"
Write-Host "  backend zip : $ZipBackend"
Write-Host "  admin zip   : $ZipAdmin"
Write-Host "  docs        : $(Join-Path $ReleaseDir 'baota-docs')"
