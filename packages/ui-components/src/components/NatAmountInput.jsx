import { parseAsNat } from '../display/natValue/parseAsNat.js';
import { stringifyNat } from '../display/natValue/stringifyNat.js';

// https://material-ui.com/api/text-field/

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.

const makeNatAmountInput =
  ({ React, TextField }) =>
  ({
    label = 'Amount',
    value = 0n,
    decimalPlaces = 0,
    placesToShow = undefined,
    disabled = false,
    error = false,
    onChange = () => {},
    required = false,
    helperText = null,
    className = '',
  }) => {
    const step = 1;
    if (typeof placesToShow !== 'number') {
      placesToShow = decimalPlaces > 0 ? 2 : 0;
    }

    // No negative values allowed in the input
    const inputProps = {
      inputProps: { min: 0, step },
    };

    const valueString = stringifyNat(value, decimalPlaces, placesToShow);

    // Use react state so it knows to re-render on fieldString change
    const [fieldString, setFieldString] = React.useState(
      value === null ? '0' : valueString,
    );

    const preventSubtractChar = e => {
      if (e.key === 'Subtract') {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Display the rendered version of the value when
    // the user stops editing the component.
    const handleOnBlur = _ => {
      setFieldString(valueString);
    };

    // We want to delay the input validation so that the user can type
    // freely, and then it gets formatted appropriately after the user stops.
    const handleOnChange = ev => {
      const str = ev.target.value;
      // Show the user exactly what they are typing
      setFieldString(str);
      const parsed = parseAsNat(str, decimalPlaces);
      onChange(parsed);
    };

    // If what the user is typing parses to the current
    // value (though it might have extra punctuation),
    // then show that rather than a computed display string
    const displayString =
      value === parseAsNat(fieldString, decimalPlaces)
        ? fieldString
        : valueString;

    return (
      <TextField
        label={label}
        type="number"
        variant="outlined"
        InputProps={inputProps}
        onChange={handleOnChange}
        onBlur={handleOnBlur}
        onKeyPress={preventSubtractChar}
        value={displayString}
        disabled={disabled}
        error={error}
        required={required}
        helperText={helperText}
        fullWidth
        className={className}
      />
    );
  };

export default makeNatAmountInput;
