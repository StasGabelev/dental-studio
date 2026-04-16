# deploy.ps1
param([string]$Message = "")

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$panelFile = Join-Path $root "admin\panel.html"
$panelContent = Get-Content $panelFile -Raw -Encoding UTF8

if ($panelContent -match 'v(\d+)\.(\d+)\.(\d+)') {
    $major = [int]$Matches[1]
    $minor = [int]$Matches[2]
    $patch = [int]$Matches[3]
    $oldVer = "v$major.$minor.$patch"
    $newVer = "v$major.$minor.$($patch + 1)"
} else {
    Write-Host "ERROR: version not found" -ForegroundColor Red
    exit 1
}

Write-Host "Version: $oldVer -> $newVer" -ForegroundColor Cyan

$files = Get-ChildItem -Path $root -Filter "*.html" -Recurse
$count = 0
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw -Encoding UTF8
    if ($c -match [regex]::Escape($oldVer)) {
        $c2 = $c -replace [regex]::Escape($oldVer), $newVer
        Set-Content -Path $f.FullName -Value $c2 -Encoding UTF8 -NoNewline
        $count++
        Write-Host "  OK: $($f.Name)" -ForegroundColor DarkGray
    }
}
Write-Host "Updated $count files" -ForegroundColor Green

if ([string]::IsNullOrWhiteSpace($Message)) { $Message = "deploy: $newVer" }

Set-Location $root
git add -A
git commit -m $Message
git push origin main

Write-Host "DEPLOY $newVer DONE" -ForegroundColor Green
