import { mount } from 'enzyme';
import Button from '@mui/material/Button';
import { act } from '@testing-library/react';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import { createTheme, ThemeProvider } from '@mui/material';
import MakePurse from '../MakePurse';

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
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
    pursePetname: 'YOLO Stack',
    currentAmount: { value: 62000000n },
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
    actions: {
      send: jest.fn(),
    },
  },
];

const issuers = [
  {
    id: 0,
    issuerBoardId: '123',
    issuerPetname: 'zoe invite',
  },
  {
    id: 1,
    issuerBoardId: '456',
    issuerPetname: 'Moola',
  },
];

const setPendingPurseCreations = jest.fn();
const schemaActions = { createPurse: jest.fn() };

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <ThemeProvider theme={appTheme}>
        <Component
          issuers={issuers}
          purses={purses}
          setPendingPurseCreations={setPendingPurseCreations}
          schemaActions={schemaActions}
          {...props}
        />
      </ThemeProvider>
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the issuer petname', () => {
  const component = mount(<MakePurse issuerId={1} handleClose={jest.fn()} />);

  expect(component.text()).toContain('Create New Purse for Moola');
});

test('disables the send button with no input', () => {
  const component = mount(<MakePurse issuerId={0} handleClose={jest.fn()} />);

  const sendButton = component.find(Button).get(1);
  expect(sendButton.props.disabled).toEqual(true);
});

test('calls handleClose on cancel', () => {
  const handleClose = jest.fn();
  const component = mount(<MakePurse issuerId={0} handleClose={handleClose} />);

  const closeButton = component.find(Button).get(0);
  closeButton.props.onClick();
  expect(handleClose).toHaveBeenCalled();
});

test('disallows existing petnames', () => {
  const component = mount(<MakePurse issuerId={0} handleClose={jest.fn()} />);

  let textField = component.find(TextField);

  act(() => textField.props().onChange({ target: { value: 'YOLO Stack' } }));
  component.update();

  textField = component.find(TextField);
  const sendButton = component.find(Button).get(1);
  expect(sendButton.props.disabled).toEqual(true);
  expect(textField.props().error).toEqual(true);
  expect(textField.props().helperText).toEqual('Petname already exists');
});

test('enables create button on valid input', () => {
  const component = mount(<MakePurse issuerId={0} handleClose={jest.fn()} />);

  let textField = component.find(TextField);

  act(() => textField.props().onChange({ target: { value: 'College fund' } }));
  component.update();

  textField = component.find(TextField);
  const createButton = component.find(Button).get(1);
  expect(createButton.props.disabled).toEqual(false);
  expect(textField.props().error).toEqual(false);
  expect(textField.props().helperText).toEqual('');
});

test('creates the purse', async () => {
  const handleClose = jest.fn();
  const component = mount(<MakePurse issuerId={1} handleClose={handleClose} />);

  const textField = component.find(TextField);
  act(() => textField.props().onChange({ target: { value: 'Savings' } }));
  component.update();

  const createButton = component.find(Button).get(1);
  await act(async () => createButton.props.onClick());
  component.update();

  expect(schemaActions.createPurse).toHaveBeenCalledWith(issuers[1], 'Savings');
  expect(setPendingPurseCreations).toHaveBeenCalledWith({
    isPending: true,
    issuerId: 1,
  });
  expect(setPendingPurseCreations).toHaveBeenCalledWith({
    isPending: false,
    issuerId: 1,
  });
  expect(handleClose).toHaveBeenCalled();
  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toEqual(true);
  expect(snackbar.props().message).toEqual('Successfully created purse.');
});

test('shows an error when purse creation fails', async () => {
  schemaActions.createPurse.mockRejectedValue(new Error('Cannot create purse'));

  const component = mount(<MakePurse issuerId={1} handleClose={jest.fn()} />);

  const textField = component.find(TextField);
  act(() => textField.props().onChange({ target: { value: 'Savings' } }));
  component.update();

  const createButton = component.find(Button).get(1);
  await act(async () => createButton.props.onClick());
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toEqual(true);
  expect(snackbar.props().message).toEqual('Failed to create purse.');
});
