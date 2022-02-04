import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { createTheme, ThemeProvider } from '@mui/material';
import Purses, { PursesWithoutContext } from '../Purses';
import PurseAmount from '../PurseAmount';
import Transfer from '../Transfer';

jest.mock('../PurseAmount', () => () => 'PurseAmount');

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

jest.mock('@agoric/ui-components', () => ({
  parseAsValue: str => new BigInt(str),
}));

const appTheme = createTheme({
  palette: {
    cancel: {
      main: '#595959',
    },
  },
});

const purses = [
  {
    id: 0,
    brandPetname: 'Moola',
    pursePetname: 'Test currency',
    currentAmount: { value: 62000000n },
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
  },
  {
    id: 1,
    brandPetname: 'TestNFT',
    pursePetname: 'Non-fungible testing tokens',
    currentAmount: { value: ['Test token 1', 'Test token 2'] },
    displayInfo: {
      assetKind: 'set',
    },
  },
];

const pendingTransfers = new Set([0]);

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        purses={purses}
        pendingTransfers={pendingTransfers}
        {...props}
      />
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the purse amounts', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Purses />
    </ThemeProvider>,
  );

  expect(component.find(PurseAmount)).toHaveLength(2);
});

test('renders a loading indicator over pending transfers', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Purses />
    </ThemeProvider>,
  );

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(1);
});

test('renders a loading indicator when purses is null', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <PursesWithoutContext />
    </ThemeProvider>,
  );

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(0);
});

test('opens the transfer dialog when the button is clicked', async () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Purses />
    </ThemeProvider>,
  );

  const firstSendButton = component.find(Button).get(0);
  await act(async () => firstSendButton.props.onClick());
  component.update();

  const transfer = component.find(Transfer);
  expect(transfer.props().purse).toEqual(purses[1]);
});
