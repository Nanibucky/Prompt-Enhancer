#!/bin/bash
# direct-paste-linux.sh
# A simplified script that focuses on finding a non-terminal window to paste to

# Log file
LOG_FILE="/tmp/direct-paste-linux.log"
echo "Starting direct paste script" > "$LOG_FILE"

# Function to log messages
log() {
  echo "$(date): $1" >> "$LOG_FILE"
}

# Check if xdotool is available
if ! command -v xdotool &> /dev/null; then
  log "xdotool is not available, trying ydotool"
  
  # Try ydotool for Wayland
  if command -v ydotool &> /dev/null; then
    log "Using ydotool for Wayland"
    sleep 1
    ydotool key 29 47  # Ctrl+V
    log "Paste command sent using ydotool"
    exit 0
  else
    log "Neither xdotool nor ydotool is available"
    exit 1
  fi
fi

# Get the active window information
ACTIVE_WINDOW_ID=$(xdotool getactivewindow)
ACTIVE_WINDOW_NAME=$(xdotool getwindowname "$ACTIVE_WINDOW_ID")
ACTIVE_WINDOW_CLASS=$(xdotool getwindowclassname "$ACTIVE_WINDOW_ID")

log "Active window: $ACTIVE_WINDOW_NAME (ID: $ACTIVE_WINDOW_ID, Class: $ACTIVE_WINDOW_CLASS)"

# Check if the active window is our app or a terminal
if [[ "$ACTIVE_WINDOW_NAME" == *"prompt"* ]] || [[ "$ACTIVE_WINDOW_NAME" == *"Electron"* ]] || [[ "$ACTIVE_WINDOW_NAME" == *"Terminal"* ]] || [[ "$ACTIVE_WINDOW_CLASS" == *"terminal"* ]]; then
  log "Active window is our app or a terminal, trying to find another window"
  
  # Get a list of all visible windows
  WINDOW_IDS=$(xdotool search --onlyvisible --name ".*")
  
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
        
        # Paste
        xdotool key --clearmodifiers ctrl+v
        log "Pasted to window: $WINDOW_NAME"
        exit 0
      fi
    fi
  done
  
  # If no suitable window was found, try Alt+Tab
  log "No suitable window found, trying Alt+Tab"
  xdotool key --clearmodifiers alt+Tab
  sleep 0.5
  xdotool key --clearmodifiers ctrl+v
  log "Pasted after Alt+Tab"
else
  # If the active window is already suitable, just paste
  log "Active window is suitable, pasting directly"
  xdotool key --clearmodifiers ctrl+v
  log "Pasted to active window"
fi

exit 0
