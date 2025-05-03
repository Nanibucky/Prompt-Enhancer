#!/bin/bash
# direct-paste.sh
# This script is used to directly paste text from the clipboard to the active window
# It first checks if the active window is our app or a terminal, and if so, tries to switch to another window

# Log file
LOG_FILE="/tmp/direct-paste.log"

# Function to log messages
log() {
  echo "$(date): $1" >> "$LOG_FILE"
}

log "Starting direct-paste.sh"

# Get the active window information
if command -v xdotool &> /dev/null; then
  # Using xdotool for X11
  ACTIVE_WINDOW_ID=$(xdotool getactivewindow)
  ACTIVE_WINDOW_NAME=$(xdotool getwindowname "$ACTIVE_WINDOW_ID")
  ACTIVE_WINDOW_CLASS=$(xdotool getwindowclassname "$ACTIVE_WINDOW_ID")
  
  log "Active window: $ACTIVE_WINDOW_NAME (ID: $ACTIVE_WINDOW_ID, Class: $ACTIVE_WINDOW_CLASS)"
  
  # Check if the active window is our app or a terminal
  if [[ "$ACTIVE_WINDOW_NAME" == *"prompt"* ]] || [[ "$ACTIVE_WINDOW_NAME" == *"Electron"* ]] || [[ "$ACTIVE_WINDOW_NAME" == *"Terminal"* ]] || [[ "$ACTIVE_WINDOW_CLASS" == *"terminal"* ]]; then
    log "Active window is our app or a terminal, trying to switch to another window"
    
    # Get a list of all windows
    WINDOW_IDS=$(xdotool search --onlyvisible --name ".*" | sort)
    
    # Try to find a suitable window to switch to
    for WINDOW_ID in $WINDOW_IDS; do
      if [ "$WINDOW_ID" != "$ACTIVE_WINDOW_ID" ]; then
        WINDOW_NAME=$(xdotool getwindowname "$WINDOW_ID")
        WINDOW_CLASS=$(xdotool getwindowclassname "$WINDOW_ID")
        
        # Skip empty names, our app, and terminals
        if [[ -n "$WINDOW_NAME" ]] && [[ "$WINDOW_NAME" != *"prompt"* ]] && [[ "$WINDOW_NAME" != *"Electron"* ]] && [[ "$WINDOW_NAME" != *"Terminal"* ]] && [[ "$WINDOW_CLASS" != *"terminal"* ]]; then
          log "Found suitable window: $WINDOW_NAME (ID: $WINDOW_ID, Class: $WINDOW_CLASS)"
          
          # Activate the window
          xdotool windowactivate "$WINDOW_ID"
          sleep 0.5
          
          # Get the new active window
          NEW_ACTIVE_WINDOW_ID=$(xdotool getactivewindow)
          NEW_ACTIVE_WINDOW_NAME=$(xdotool getwindowname "$NEW_ACTIVE_WINDOW_ID")
          log "New active window: $NEW_ACTIVE_WINDOW_NAME (ID: $NEW_ACTIVE_WINDOW_ID)"
          
          break
        fi
      fi
    done
  fi
  
  # Paste the text
  sleep 0.5
  xdotool key --clearmodifiers ctrl+v
  log "Paste command sent using xdotool"
  exit 0
elif command -v ydotool &> /dev/null; then
  # Using ydotool for Wayland
  log "Using ydotool for Wayland"
  
  # We can't easily get window information with ydotool, so just try to paste
  sleep 1.0
  ydotool key 29 47  # Ctrl+V
  log "Paste command sent using ydotool"
  exit 0
else
  log "Neither xdotool nor ydotool is available"
  exit 1
fi
