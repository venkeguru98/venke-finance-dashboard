$target = Join-Path $PSScriptRoot "launch.bat"
$shortcutPath = Join-Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup" "VENKEFinanceDashboard.lnk"

# Create Shortcut using COM Object
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = $target
$Shortcut.WorkingDirectory = $PSScriptRoot
$Shortcut.Description = "VENKE Finance Dashboard Auto-Startup"
$Shortcut.Save()

Write-Host "=============================================" -ForegroundColor Green
Write-Host " VENKE Finance Dashboard Auto-Startup Set!   " -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "The application will now launch on system boot."
Write-Host "Shortcut created in Startup folder:"
Write-Host $shortcutPath -ForegroundColor Yellow
Write-Host "============================================="
