// motor_controller.st
// Simple PI motor speed controller template (Structured Text)
// This PROGRAM provides a basic speed control loop for a motor.
// Inputs to be wired by the PLC program: setpoint_rpm, actual_rpm, and enabled.

PROGRAM MotorController
VAR
  // User-configurable parameters
  kp          : REAL := 0.2;     // Proportional gain
  ki          : REAL := 0.05;    // Integral gain
  dt          : REAL := 0.01;    // Cycle time [s]
  max_output  : REAL := 100.0;   // Max control output (e.g., % of max drive)

  // Runtime state
  setpoint_rpm: REAL := 0.0;       // Desired speed [RPM]
  actual_rpm  : REAL := 0.0;       // Measured speed [RPM]
  control_out : REAL := 0.0;       // Output to motor drive (e.g., PWM duty)
  enabled     : BOOL := FALSE;     // Enable controller

  // Internal terms
  integrator   : REAL := 0.0;
  error        : REAL := 0.0;
END_VAR

// NOTE: In many setups, setpoint_rpm/actual_rpm/enabled will be written by other blocks
// and the controller outputs to a drive interface.

IF enabled THEN
  error := setpoint_rpm - actual_rpm;
  integrator := integrator + error * dt;
  control_out := (kp * error) + (ki * integrator);

  // Anti-windup / saturation
  IF control_out > max_output THEN
    control_out := max_output;
  ELSIF control_out < -max_output THEN
    control_out := -max_output;
  END_IF;
ELSE
  // If disabled, ensure outputs are safe
  control_out := 0.0;
  integrator   := 0.0;
END_IF

// Output mapping would typically be performed outside this block,
// e.g., assign control_out to an analog drive or PWM channel.

END_PROGRAM