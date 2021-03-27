import { parseAsNat } from '../display/natValue/parseAsNat';
import { stringifyNat } from '../display/natValue/stringifyNat';

// https://material-ui.com/api/text-field/

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.

const makeNatAmountInput = ({ React, TextField }) => ({
  label = 'Amount',
  value = 0n,
  decimalPlaces = 0,
  placesToShow = 2,
  disabled = false,
  error = false,
  onChange = () => {},
  required = false,
  helperText = null,
}) => {
  const step = decimalPlaces > 0 ? 1 / 10 ** placesToShow : 1;

  // No negative values allowed in the input
  const inputProps = {
    inputProps: { min: 0, step },
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
      InputProps={inputProps}
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
