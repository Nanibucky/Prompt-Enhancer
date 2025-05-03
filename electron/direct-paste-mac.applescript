-- direct-paste-mac.applescript
-- This script focuses on the most recently used application (not Terminal or our app) and pastes

-- Wait a moment for any window operations to complete
delay 0.5

-- Get a list of all running applications
tell application "System Events"
    set allApps to name of every application process whose background is false
end tell

-- Log the list of running applications
log "Running applications: " & allApps

-- Filter out Terminal, iTerm, and our app
set targetApps to {}
repeat with appName in allApps
    if appName is not "Terminal" and appName is not "iTerm" and appName is not "iTerm2" and appName is not "Electron" and appName is not "prompts" then
        set end of targetApps to appName
    end if
end repeat

log "Potential target applications: " & targetApps

-- If we have target apps, activate the first one and paste
if length of targetApps > 0 then
    set targetApp to item 1 of targetApps
    log "Activating application: " & targetApp
    
    -- Activate the target application
    tell application targetApp
        activate
    end tell
    
    -- Wait for activation to complete
    delay 0.5
    
    -- Paste the content
    tell application "System Events"
        keystroke "v" using {command down}
    end tell
    
    log "Pasted to application: " & targetApp
    return "Pasted to " & targetApp
else
    -- If no suitable application was found, try using the frontmost application
    tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        log "Current frontmost application: " & frontApp
        
        -- If the frontmost app is not Terminal or our app, paste to it
        if frontApp is not "Terminal" and frontApp is not "iTerm" and frontApp is not "iTerm2" and frontApp is not "Electron" and frontApp is not "prompts" then
            keystroke "v" using {command down}
            log "Pasted to frontmost application: " & frontApp
            return "Pasted to " & frontApp
        else
            -- Try to find any visible application that's not Terminal or our app
            set visibleApps to name of every application process whose visible is true
            repeat with appName in visibleApps
                if appName is not "Terminal" and appName is not "iTerm" and appName is not "iTerm2" and appName is not "Electron" and appName is not "prompts" then
                    log "Activating visible application: " & appName
                    tell application appName
                        activate
                    end tell
                    delay 0.5
                    keystroke "v" using {command down}
                    log "Pasted to application: " & appName
                    return "Pasted to " & appName
                end if
            end repeat
            
            -- Last resort: try to use Alt+Tab to switch to previous app and paste
            log "No suitable application found, trying Alt+Tab"
            key code 48 using {option down} -- Alt+Tab
            delay 0.5
            keystroke "v" using {command down}
            return "Attempted paste after Alt+Tab"
        end if
    end tell
end if
