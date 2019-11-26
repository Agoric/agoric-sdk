import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Stepper, Step, StepLabel } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
}));

export default function TransactionSummary({
  connected,
  inputPurse,
  outputPurse,
  inputAmount,
  outputAmount,
}) {
  const classes = useStyles();

  const steps = ['Connect', 'Select Currencies', 'Enter Amounts', 'Swap'];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!connected) {
      setActiveStep(0);
    } else if (!inputPurse || !outputPurse) {
      setActiveStep(1);
    } else if (!(inputAmount > 0) || !(outputAmount > 0)) {
      setActiveStep(2);
    } else {
      setActiveStep(3);
    }
  }, [connected, inputPurse, outputPurse, inputAmount, outputAmount]);

  return (
    <Stepper
      alternativeLabel
      activeStep={activeStep}
      className={classes.stepper}
    >
      {steps.map(label => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
