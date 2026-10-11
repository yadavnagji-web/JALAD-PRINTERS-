/**
 * Client-side 100% fail-safe blob downloader for Windows Auto-Start setup files.
 * Works seamlessly in iframe preview, standalone browsers, and mobile devices.
 */
export async function downloadSetupFile(type: 'bat' | 'vbs' | 'widget', shopName: string = 'JALAD PRINTERS'): Promise<void> {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetUrl = `${origin}/?mode=owner&minimized=true&autostart=true`;

  let content = '';
  let filename = '';
  let mimeType = 'text/plain';

  if (type === 'bat') {
    filename = 'SmartQRPrint-ShopMonitor-Setup.bat';
    mimeType = 'application/x-bat';
    content = `@echo off
chcp 65001 >nul
title Smart QR Print - Dukandar 24x7 Desktop Auto-Start Setup
color 0B
echo ======================================================================
echo    SMART QR PRINT - DUKANDAR 24x7 DESKTOP AUTO-START INSTALLER
echo    Dukan: ${shopName}
echo ======================================================================
echo.
echo [1/3] Setting up 24x7 Shopkeeper Background Monitor...
echo Target Server URL: ${targetUrl}
echo.

set "TARGET_URL=${targetUrl}"
set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"
set "VBS_FILE=%STARTUP_DIR%\\SmartQRPrint-ShopMonitor.vbs"
set "DESKTOP_VBS=%DESKTOP_DIR%\\SmartQRPrint-ShopMonitor.vbs"

echo [2/3] Registering Windows Auto-Start Service (shell:startup)...
(
  echo Set WshShell = CreateObject("WScript.Shell"^)
  echo Dim browserCmd
  echo If CreateObject("Scripting.FileSystemObject"^).FileExists("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"^) Then
  echo     browserCmd = """C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"" --app=""" ^& "%TARGET_URL%" ^& """ --start-minimized --kiosk-printing"
  echo ElseIf CreateObject("Scripting.FileSystemObject"^).FileExists("C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"^) Then
  echo     browserCmd = """C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"" --app=""" ^& "%TARGET_URL%" ^& """ --start-minimized --kiosk-printing"
  echo ElseIf CreateObject("Scripting.FileSystemObject"^).FileExists("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"^) Then
  echo     browserCmd = """C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"" --app=""" ^& "%TARGET_URL%" ^& """ --start-minimized --kiosk-printing"
  echo Else
  echo     browserCmd = "cmd /c start """" """ ^& "%TARGET_URL%" ^& """"
  echo End If
  echo WshShell.Run browserCmd, 7, False
) > "%VBS_FILE%"

echo [3/3] Creating Desktop Shortcut...
copy /y "%VBS_FILE%" "%DESKTOP_VBS%" >nul

echo.
echo ======================================================================
echo  [SUCCESS] 24x7 DESKTOP SHOPKEEPER MONITOR INSTALLED!
echo  - Computer on hote hi background me monitor automatic chalega.
echo  - Screen par minimize rahega.
echo  - Jab bhi koi customer pay karega, turant Cash/Online popup khulega!
echo  - Desktop par shortcut "SmartQRPrint-ShopMonitor.vbs" ready hai.
echo ======================================================================
echo.
echo Launching monitor now in background...
wscript.exe "%VBS_FILE%"
echo.
echo Monitor is now ACTIVE! You can close this window.
timeout /t 5
`;
  } else if (type === 'vbs') {
    filename = 'SmartQRPrint-ShopMonitor.vbs';
    mimeType = 'text/vbscript';
    content = `' Smart QR Print - Silent Background Auto-Start Script
Set WshShell = CreateObject("WScript.Shell")
Dim targetUrl, browserCmd
targetUrl = "${targetUrl}"

If CreateObject("Scripting.FileSystemObject").FileExists("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe") Then
    browserCmd = """C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"" --app=""" & targetUrl & """ --start-minimized --kiosk-printing"
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe") Then
    browserCmd = """C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"" --app=""" & targetUrl & """ --start-minimized --kiosk-printing"
ElseIf CreateObject("Scripting.FileSystemObject").FileExists("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe") Then
    browserCmd = """C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"" --app=""" & targetUrl & """ --start-minimized --kiosk-printing"
Else
    browserCmd = "cmd /c start """" """ & targetUrl & """"
End If

WshShell.Run browserCmd, 7, False
`;
  } else if (type === 'widget') {
    filename = 'SmartQRPrint-Desktop-Widget.html';
    mimeType = 'text/html';
    try {
      const res = await fetch('/api/setup/download/widget');
      if (res.ok) {
        content = await res.text();
      }
    } catch {}

    if (!content) {
      content = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Smart QR Print - Desktop Widget</title>
  <style>body { background: #0f172a; color: white; font-family: sans-serif; padding: 20px; text-align: center; }</style>
</head>
<body>
  <h2>🏪 Smart QR Print - 24x7 Desktop Spooler</h2>
  <p>यह विजेट बैकग्राउंड में ऑटो-प्रिंट ऑर्डर्स की जांच करता है।</p>
  <script>location.href = "${origin}/?mode=owner&minimized=true";</script>
</body>
</html>`;
    }
  }

  // Create Blob URL and trigger browser download
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    URL.revokeObjectURL(blobUrl);
  }, 300);
}
