-- direct-paste.applescript
-- This script is used to directly paste text from the clipboard to the frontmost application

-- Wait a moment for focus to return to the previous application
delay 1.0

-- Get the name of the frontmost application
tell application "System Events"
  set frontApp to first application process whose frontmost is true
  set frontAppName to name of frontApp
  log "Current frontmost app: " & frontAppName
end tell

-- If the frontmost app is Terminal, iTerm, or our app, try to switch to another app
if frontAppName is "Terminal" or frontAppName is "iTerm" or frontAppName is "iTerm2" or frontAppName is "Electron" or frontAppName is "prompts" then
  log "Frontmost app is " & frontAppName & ", trying to switch to another app"
  
  -- Get all visible applications
  set visibleApps to name of every process whose visible is true
  
  -- Find a suitable target app (not Terminal, iTerm, or our app)
  set targetApp to ""
  repeat with appName in visibleApps
    if appName is not "Terminal" and appName is not "iTerm" and appName is not "iTerm2" and appName is not "Electron" and appName is not "prompts" then
      set targetApp to appName
      exit repeat
    end if
  end repeat
  
  -- If we found a suitable app, activate it
  if targetApp is not "" then
    log "Switching to " & targetApp
    tell application targetApp to activate
    delay 0.5
  else
    -- If no suitable app was found, try using Alt+Tab
    log "No suitable app found, trying Alt+Tab"
    tell application "System Events"
      key code 48 using {option down}
      delay 0.5
    end tell
  end if
  
  -- Get the new frontmost app
  tell application "System Events"
    set frontApp to first application process whose frontmost is true
    set frontAppName to name of frontApp
    log "New frontmost app: " & frontAppName
  end tell
end if

-- Paste the text
tell application "System Events"
  keystroke "v" using {command down}
end tell

-- Return the name of the app we pasted to
return "Pasted to " & frontAppName
