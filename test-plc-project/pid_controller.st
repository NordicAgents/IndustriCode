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
