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
  placesToShow = 0,
  disabled = false,
  error = false,
  onChange = () => {},
  required = false,
  helperText = null,
}) => {
  console.log('DISPLAYING NAT AMOUNT INPUT');
  const [displayString, setDisplayString] = React.useState(
    value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow),
  );

  const step = 1;
  placesToShow = decimalPlaces > 0 ? 2 : 0;

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

  const handleOnChange = ev => {
    const str = ev.target.value;
    console.log('STRING', str);
    const parsed = parseAsNat(str, decimalPlaces);
    console.log('PARSED', parsed);
    setDisplayString(str);
    // onChange(parsed);
  };

  return (
    <TextField
      label={label}
      type="number"
      variant="outlined"
      InputProps={inputProps}
      onChange={handleOnChange}
      onKeyPress={preventSubtractChar}
      value={displayString}
      disabled={disabled}
      error={error}
      required={required}
      helperText={helperText}
    />
  );
};

export default makeNatAmountInput;
