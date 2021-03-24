import { parseAsNat } from '../display/natValue/parseAsNat';
import { stringifyNat } from '../display/natValue/stringifyNat';

// https://material-ui.com/api/text-field/

const makeNatAmountInput = (react, textfield) => ({
  label,
  value,
  decimalPlaces = 0,
  placesToShow = 2,
  disabled,
  error,
  onChange,
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

  return react.createElement(textfield, {
    label,
    type: 'number',
    variant: 'outlined',
    fullWidth: true,
    InputProps: noNegativeValues,
    onChange: ev => onChange(parseAsNat(ev.target.value, decimalPlaces)),
    onKeyPress: preventSubtractChar,
    value:
      value === null ? '0' : stringifyNat(value, decimalPlaces, placesToShow),
    disabled,
    error,
  });
};

export default makeNatAmountInput;
