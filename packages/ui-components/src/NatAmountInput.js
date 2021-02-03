import React from 'react';
import { TextField } from '@material-ui/core';

import { stringifyValue } from './display';

// https://material-ui.com/api/text-field/

const NatAmountInput = ({
  label,
  value,
  displayInfo = { amountMathKind: 'nat', decimalPlaces: 0 },
  disabled,
  error,
  onChange,
  onError,
}) => {
  // No negative values allowed in the input
  const noNegativeValues = {
    inputProps: { min: 0 },
  };

  const preventMinusChar = e => {
    if (e.key === 'Subtract') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Number Inputs only make sense for MathKind.NAT
  if (displayInfo.amountMathKind !== 'nat') {
    onError(Error('Not a fungible token'));
    return (
      <TextField
        label={label}
        type="number"
        variant="outlined"
        fullWidth
        disabled={true}
        error={true}
        helperText={'Error: Asset is not a fungible token.'}
      />
    );
  }

  return (
    <TextField
      label={label}
      type="number"
      variant="outlined"
      fullWidth
      InputProps={noNegativeValues}
      onChange={onChange}
      onKeyPress={preventMinusChar}
      value={stringifyValue(value, displayInfo)}
      disabled={disabled}
      error={error}
    />
  );
};

export default NatAmountInput;
