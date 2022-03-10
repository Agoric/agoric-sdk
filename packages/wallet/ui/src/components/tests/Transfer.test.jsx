import { mount } from 'enzyme';
import Button from '@mui/material/Button';
import { act } from '@testing-library/react';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import { createTheme, ThemeProvider } from '@mui/material';
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
  parseAsValue: str => BigInt(str),
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
    actions: {
      send: jest.fn(),
    },
  },
  {
    id: 1,
    brandPetname: 'Moola',
    pursePetname: 'Test currency fees',
    currentAmount: { value: 62000000n },
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
    actions: {
      send: jest.fn(),
    },
  },
  {
    id: 2,
    brandPetname: 'TestNFT',
    pursePetname: 'Non-fungible testing tokens',
    currentAmount: { value: ['Test token 1', 'Test token 2'] },
    displayInfo: {
      assetKind: 'set',
    },
  },
];
const contacts = [
  {
    actions: {
      send: jest.fn(),
    },
    id: 3,
    test: 'Self',
  },
];
const setPendingTransfers = jest.fn();

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        purses={purses}
        contacts={contacts}
        setPendingTransfers={setPendingTransfers}
        {...props}
      />
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the purse name', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={jest.fn()} />
    </ThemeProvider>,
  );

  expect(component.text()).toContain('Transfer from Test currency');
});

test('disables the send button with no input', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={jest.fn()} />
    </ThemeProvider>,
  );

  const sendButton = component.find(Button).get(1);
  expect(sendButton.props.disabled).toEqual(true);
});

test('calls handleClose on cancel', () => {
  const handleClose = jest.fn();
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={handleClose} />
    </ThemeProvider>,
  );

  const sendButton = component.find(Button).get(0);
  sendButton.props.onClick();
  expect(handleClose).toHaveBeenCalled();
});

test('displays invalid amount on invalid input', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={jest.fn()} />
    </ThemeProvider>,
  );
  let textField = component.find(TextField);
  let sendButton = component.find(Button).get(1);

  act(() => textField.props().onChange({ target: { value: 'asdf' } }));
  component.update();

  textField = component.find(TextField);
  sendButton = component.find(Button).get(1);
  expect(sendButton.props.disabled).toEqual(true);
  expect(textField.props().error).toEqual(true);
  expect(textField.props().helperText).toEqual('Invalid amount');
});

test('enables send button on valid input', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={jest.fn()} />
    </ThemeProvider>,
  );
  let textField = component.find(TextField);
  let sendButton = component.find(Button).get(1);
  const destinationSelect = component.find(Select).first();

  act(() => textField.props().onChange({ target: { value: '1000000' } }));
  act(() => destinationSelect.props().onChange({ target: { value: 1 } }));
  component.update();

  textField = component.find(TextField);
  sendButton = component.find(Button).get(1);
  expect(sendButton.props.disabled).toEqual(false);
  expect(textField.props().error).toEqual(false);
  expect(textField.props().helperText).toEqual('');
});

test('sends the payment', async () => {
  const handleClose = jest.fn();
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={handleClose} />
    </ThemeProvider>,
  );
  const textField = component.find(TextField);
  const destinationSelect = component.find(Select).first();

  act(() => textField.props().onChange({ target: { value: '1000000' } }));
  act(() => destinationSelect.props().onChange({ target: { value: 1 } }));
  component.update();
  const sendButton = component.find(Button).get(1);
  await act(async () => sendButton.props.onClick());
  component.update();

  expect(purses[0].actions.send).toHaveBeenCalledWith(
    purses[1].actions,
    BigInt(1000000),
  );
  expect(setPendingTransfers).toHaveBeenCalledWith({
    isPending: true,
    purseId: 0,
  });
  expect(setPendingTransfers).toHaveBeenCalledWith({
    isPending: false,
    purseId: 0,
  });
  expect(handleClose).toHaveBeenCalled();
  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toEqual(true);
  expect(snackbar.props().message).toEqual('Transfer completed.');
});

test('shows an error when the transfer fails', async () => {
  purses[0].actions.send.mockRejectedValue(new Error('Cannot send payment'));
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <Transfer purse={purses[0]} handleClose={jest.fn()} />
    </ThemeProvider>,
  );
  const textField = component.find(TextField);
  const destinationSelect = component.find(Select).first();

  act(() => textField.props().onChange({ target: { value: '1000000' } }));
  act(() => destinationSelect.props().onChange({ target: { value: 1 } }));
  const sendButton = component.find(Button).get(1);
  await act(async () => sendButton.props.onClick());
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toEqual(true);
  expect(snackbar.props().message).toEqual('Transfer failed.');
});
