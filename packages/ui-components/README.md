# UI Components

Reusable UI Components for [Agoric](https://agoric.com) [Dapps](https://agoric.com/documentation/dapps/), built with [React](https://reactjs.org) and [MaterialUI](https://materialui.com).

## NatAmountInput

A [React](https://reactjs.org) [MaterialUI TextField
Input](https://material-ui.com/api/text-field/) which allows the user
to enter a `Nat`. Handles `decimalPlaces` appropriately. This is a
controlled component.

Example:

```
import { NatAmountInput } from '@agoric/ui-components';

<NatAmountInput
  label={label} // the label
  value={amount && amount.value} // The value to display. Must be a Nat
  decimalPlaces={purse.displayInfo && purse.displayInfo.decimalPlaces}
  placesToShow={2}
  disabled={disabled} // disable the input
  error={amountError} // any error to display
  onChange={onAmountChange} // a callback called on user input changing the value
  onError={() => {}} // a callback called on errors
/>
```

## Yarn Test

```sh
yarn build
yarn test
```