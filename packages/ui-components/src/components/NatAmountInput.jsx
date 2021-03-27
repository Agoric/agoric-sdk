import { parseAsNat } from '../display/natValue/parseAsNat';
import { stringifyNat } from '../display/natValue/stringifyNat';
import { debounce } from '../helpers';

// https://material-ui.com/api/text-field/

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.

const DEBOUNCE_WAIT_MS = 800;

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
  console.log('receiving new value', value);

  // Use react state so it knows to re-render on displayString change
  const [displayString, setDisplayString] = React.useState(
    value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow),
  );

  console.log('displayString', displayString);

  // With use effect, the display gets completely disassociated from
  // the user's typing.
  // React.useEffect(() => {
  //   setDisplayString(
  //     value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow),
  //   );
  // }, [value, decimalPlaces, placesToShow, displayString]);

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

  const delayedOnChange = debounce(str => {
    console.log('actually parsing');
    const parsed = parseAsNat(str, decimalPlaces);
    setDisplayString(stringifyNat(parsed, decimalPlaces, placesToShow));
    onChange(parsed);
  }, DEBOUNCE_WAIT_MS);

  // We want to delay the input validation so that the user can type
  // freely, and then it gets formatted appropriately after the user stops.
  const handleOnChange = ev => {
    const str = ev.target.value;
    // Show the user exactly what they are typing
    setDisplayString(str);

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
