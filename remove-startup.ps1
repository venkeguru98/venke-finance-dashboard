$shortcutPath = Join-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup" "VENKEFinanceDashboard.lnk"
if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath
    Write-Host "VENKE Finance Dashboard Auto-Startup shortcut removed." -ForegroundColor Green
} else {
    Write-Host "Auto-Startup shortcut was not found/configured." -ForegroundColor Yellow
}
