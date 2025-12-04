PROGRAM Main
VAR
    temperature: REAL := 25.0;
    setpoint: REAL := 50.0;
    heater: BOOL := FALSE;
    counter: INT := 0;
END_VAR

// Simple temperature control logic
IF temperature < setpoint THEN
    heater := TRUE;
    counter := counter + 1;
ELSE
    heater := FALSE;
END_IF;

END_PROGRAM
