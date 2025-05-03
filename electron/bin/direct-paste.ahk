; direct-paste.ahk
; This script is used to directly paste text from the clipboard to the active window
; It first checks if the active window is our app or a terminal, and if so, tries to switch to another window

; Get the title of the active window
WinGetTitle, activeTitle, A
WinGet, activePID, PID, A
WinGet, activeProcess, ProcessName, A

; Log the active window information
FileAppend, Active window: %activeTitle% (PID: %activePID%, Process: %activeProcess%)`, %A_ScriptDir%\paste-log.txt

; Check if the active window is our app or a terminal
if (InStr(activeTitle, "prompt") or InStr(activeTitle, "Electron") or InStr(activeTitle, "Terminal") or InStr(activeTitle, "Command Prompt") or InStr(activeTitle, "PowerShell") or InStr(activeTitle, "cmd.exe"))
{
    FileAppend, `nActive window is our app or a terminal, trying to switch to another window`n, %A_ScriptDir%\paste-log.txt
    
    ; Get a list of all windows
    WinGet, windows, List
    
    ; Try to find a suitable window to switch to
    Loop, %windows%
    {
        winId := windows%A_Index%
        WinGetTitle, winTitle, ahk_id %winId%
        WinGet, winPID, PID, ahk_id %winId%
        WinGet, winProcess, ProcessName, ahk_id %winId%
        
        ; Skip empty titles, our app, and terminals
        if (winTitle != "" and winPID != activePID and !InStr(winTitle, "prompt") and !InStr(winTitle, "Electron") and !InStr(winTitle, "Terminal") and !InStr(winTitle, "Command Prompt") and !InStr(winTitle, "PowerShell") and !InStr(winTitle, "cmd.exe"))
        {
            FileAppend, Found suitable window: %winTitle% (PID: %winPID%, Process: %winProcess%)`n, %A_ScriptDir%\paste-log.txt
            
            ; Activate the window
            WinActivate, ahk_id %winId%
            Sleep, 500
            
            ; Get the new active window
            WinGetTitle, newActiveTitle, A
            FileAppend, New active window: %newActiveTitle%`n, %A_ScriptDir%\paste-log.txt
            
            break
        }
    }
}

; Paste the text
Sleep, 500
Send, ^v

FileAppend, Paste command sent`n, %A_ScriptDir%\paste-log.txt
