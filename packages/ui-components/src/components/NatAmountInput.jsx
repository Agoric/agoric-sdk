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
  let displayString =
    value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow);

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

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // `wait` milliseconds.
  const debounce = (func, wait) => {
    let timeout;

    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };

      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  const delayedOnChange = debounce(str => {
    onChange(parseAsNat(str, decimalPlaces));
  }, 50);

  // We want to delay the input validation so that the user can type
  // freely, and then it gets formatted appropriately after the user stops.
  const handleOnChange = ev => {
    const str = ev.target.value;
    // Show the user exactly what they are typing
    displayString = str;

    // Wait until the user stops typing to parse it
    delayedOnChange(str);
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
