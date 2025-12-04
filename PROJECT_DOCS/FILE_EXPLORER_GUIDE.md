# Opening Files in the PLC/HMI IDE

## Quick Start - Try This First!

The easiest way to test the file explorer is to open the project directory itself:

1. Click **"Open Folder"** in the file explorer
2. Enter this path: `/Users/mx/Documents/task_phd/mcp-manager-ui`
3. You'll see all the project files including:
   - `src/` - Source code
   - `mcp-backend/` - Backend files
   - `package.json` - Configuration files

## Opening Your PLC Files

### On macOS:
Common paths you can try:
```
/Users/mx/Documents
/Users/mx/Desktop  
/Users/mx/Documents/plc-projects
```

### On Windows:
Common paths you can try:
```
C:\Users\yourusername\Documents
C:\Users\yourusername\Desktop
C:\Users\yourusername\Documents\plc-projects
```

## Creating a Test PLC Project

To create a test PLC project with sample files:

### Option 1: Use the current project directory
```bash
cd /Users/mx/Documents/task_phd/mcp-manager-ui
mkdir test-plc-project
cd test-plc-project
```

Create a sample Structured Text file:
```bash
cat > main.st << 'EOF'
PROGRAM Main
VAR
    temperature: REAL := 25.0;
    setpoint: REAL := 50.0;
    heater: BOOL := FALSE;
END_VAR

// Simple temperature control logic
IF temperature < setpoint THEN
    heater := TRUE;
ELSE
    heater := FALSE;
END_IF;

END_PROGRAM
EOF
```

Create a sample function block:
```bash
cat > pid_controller.st << 'EOF'
FUNCTION_BLOCK PID_Controller
VAR_INPUT
    SetPoint: REAL;
    ProcessValue: REAL;
    Kp: REAL := 1.0;
    Ki: REAL := 0.1;
    Kd: REAL := 0.01;
END_VAR

VAR_OUTPUT
    ControlValue: REAL;
END_VAR

VAR
    Error: REAL;
    Integral: REAL := 0.0;
    Derivative: REAL;
    LastError: REAL := 0.0;
END_VAR

// PID calculation
Error := SetPoint - ProcessValue;
Integral := Integral + Error;
Derivative := Error - LastError;

ControlValue := (Kp * Error) + (Ki * Integral) + (Kd * Derivative);

LastError := Error;

END_FUNCTION_BLOCK
EOF
```

Then in the IDE:
1. Click "Open Folder"  
2. Enter: `/Users/mx/Documents/task_phd/mcp-manager-ui/test-plc-project`
3. You should see `main.st` and `pid_controller.st` in the file tree
4. Click on any file to open it with syntax highlighting!

### Option 2: Use your existing PLC project directory
If you have actual PLC files somewhere, just enter that directory path.

## Troubleshooting

### "Directory not found" error
- Make sure you're using the **absolute path** (starts with `/` on Mac or `C:\` on Windows)
- Check for typos in the path
- Make sure the directory actually exists

### "Permission denied" error
- Try a directory you own (like Documents or Desktop)
- Avoid system directories like `/etc/` or `/System/`
- On Windows, avoid `C:\Windows\` or `C:\Program Files\`

### Files not showing up
- Click the **Refresh** button (↻) in the file explorer header
- Make sure the directory contains files (not empty)
- Check that files aren't hidden (starting with `.`)

## What File Types Are Supported?

The editor has syntax highlighting for:
- `.st` - Structured Text
- `.scl` - Structured Control Language  
- `.il` - Instruction List
- `.js`, `.ts` - JavaScript/TypeScript
- `.json` - JSON files
- `.txt` - Plain text
- And more!

## Next: Edit and Save Files

Once files are open:
- Edit them with full IntelliSense
- Press `Ctrl+S` (Windows) or `Cmd+S` (Mac) to save
- Modified files show a dot (●) indicator
- Use multiple tabs to work on several files

Enjoy your new PLC IDE! 🚀
