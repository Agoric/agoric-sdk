import { parseAsNat } from '../display/natValue/parseAsNat';
import { stringifyNat } from '../display/natValue/stringifyNat';

// https://material-ui.com/api/text-field/

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.

const makeNatAmountInput = ({ React, TextField }) => ({
  label,
  value,
  decimalPlaces = 0,
  placesToShow = 2,
  disabled,
  error,
  onChange,
  required,
  helperText,
}) => {
  // No negative values allowed in the input
  const noNegativeValues = {
    inputProps: { min: 0 },
  };

  const preventSubtractChar = e => {
    if (e.key === 'Subtract') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <TextField
      label={label}
      type="number"
      variant="outlined"
      fullWidth
      InputProps={noNegativeValues}
      onChange={ev => onChange(parseAsNat(ev.target.value, decimalPlaces))}
      onKeyPress={preventSubtractChar}
      value={
        value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow)
      }
      disabled={disabled}
      error={error}
      required={required}
      helperText={helperText}
    />
  );
};

export default makeNatAmountInput;
