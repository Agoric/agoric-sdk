# UI Components

## NatAmountInput

A [MaterialUI TextField
Input](https://material-ui.com/api/text-field/) which allows the user
to enter a `Nat`. Handles `decimalPlaces` appropriately. This is a
controlled component.

Example:

```
import { NatAmountInput } from '@agoric/ui-components';

<NatAmountInput
  label={label} // the label
  value={amount && amount.value} // The value to display. Must be a Nat
  displayInfo={purse.displayInfo} // the displayInfo to use to display the value
  disabled={disabled} // disable the input
  error={amountError} // any error to display
  onChange={onAmountChange} // a callback called on user input changing the value
  onError={() => {}} // a callback called on errors
/>
```

## Yarn Test

```sh
yarn test
```