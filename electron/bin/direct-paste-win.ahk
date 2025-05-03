; direct-paste-win.ahk
; This script is a simplified version that focuses on finding a non-terminal window to paste to

; Create a log file
FileDelete, %A_ScriptDir%\paste-log.txt
FileAppend, Starting direct paste script`n, %A_ScriptDir%\paste-log.txt

; Get the active window information
WinGetTitle, activeTitle, A
WinGet, activePID, PID, A
WinGet, activeProcess, ProcessName, A

FileAppend, Active window: %activeTitle% (PID: %activePID%, Process: %activeProcess%)`n, %A_ScriptDir%\paste-log.txt

; Check if the active window is our app or a terminal
if (InStr(activeTitle, "prompt") or InStr(activeTitle, "Electron") or InStr(activeTitle, "Terminal") or InStr(activeTitle, "Command Prompt") or InStr(activeTitle, "PowerShell") or InStr(activeTitle, "cmd.exe"))
{
    FileAppend, Active window is our app or a terminal, trying to find another window`n, %A_ScriptDir%\paste-log.txt
    
    ; Get a list of all windows
    WinGet, id, List,,, Program Manager
    
    ; Try to find a suitable window to switch to
    Loop, %id%
    {
        this_id := id%A_Index%
        WinGetTitle, this_title, ahk_id %this_id%
        WinGet, this_process, ProcessName, ahk_id %this_id%
        
        ; Skip empty titles, our app, and terminals
        if (this_title != "" and !InStr(this_title, "prompt") and !InStr(this_title, "Electron") and !InStr(this_title, "Terminal") and !InStr(this_title, "Command Prompt") and !InStr(this_title, "PowerShell") and !InStr(this_process, "cmd.exe"))
        {
            FileAppend, Found suitable window: %this_title% (Process: %this_process%)`n, %A_ScriptDir%\paste-log.txt
            
            ; Activate the window
            WinActivate, ahk_id %this_id%
            Sleep, 500
            
            ; Paste
            Send, ^v
            FileAppend, Pasted to window: %this_title%`n, %A_ScriptDir%\paste-log.txt
            
            ; Exit the loop after finding a suitable window
            break
        }
    }
}
else
{
    ; If the active window is already suitable, just paste
    FileAppend, Active window is suitable, pasting directly`n, %A_ScriptDir%\paste-log.txt
    Send, ^v
}

FileAppend, Paste operation completed`n, %A_ScriptDir%\paste-log.txt
