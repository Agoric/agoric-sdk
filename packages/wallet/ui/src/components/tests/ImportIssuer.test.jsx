import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { createTheme, ThemeProvider } from '@mui/material';
import ImportIssuer from '../ImportIssuer';

const issuers = [
  {
    id: 0,
    issuerBoardId: '123',
    issuerPetname: 'zoe invite',
  },
  {
    id: 1,
    issuerBoardId: '456',
    issuerPetname: 'RUN',
  },
];

const appTheme = createTheme({
  palette: {
    cancel: {
      main: '#595959',
    },
  },
});

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <ThemeProvider theme={appTheme}>
        <Component issuers={issuers} {...props} />
      </ThemeProvider>
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('shows and hides the dialog correctly', () => {
  let component = mount(<ImportIssuer isOpen={false} />);

  expect(component.find(Dialog).props().open).toBe(false);

  const handleClose = jest.fn();
  component = mount(<ImportIssuer isOpen={true} handleClose={handleClose} />);
  expect(component.find(Dialog).props().open).toBe(true);
  act(() => component.find(Button).at(0).props().onClick());

  expect(handleClose).toHaveBeenCalled();
});

test('shows an error when using an existing board id', () => {
  const component = mount(<ImportIssuer isOpen={true} />);
  let textField = component.find(TextField).at(1);

  act(() => textField.props().onChange({ target: { value: '123' } }));
  component.update();

  textField = component.find(TextField).at(1);
  const importButton = component.find(Button).get(1);
  expect(importButton.props.disabled).toEqual(true);
  expect(textField.props().error).toEqual(true);
  expect(textField.props().helperText).toEqual('Board ID already imported');
});

test('shows an error when using an existing petname', () => {
  const component = mount(<ImportIssuer isOpen={true} />);
  let textField = component.find(TextField).at(0);

  act(() => textField.props().onChange({ target: { value: 'zoe invite' } }));
  component.update();

  textField = component.find(TextField).at(0);
  const importButton = component.find(Button).get(1);
  expect(importButton.props.disabled).toEqual(true);
  expect(textField.props().error).toEqual(true);
  expect(textField.props().helperText).toEqual('Petname already exists');
});

test('triggers an import when import is clicked', () => {
  const handleImport = jest.fn();
  const handleClose = jest.fn();

  const component = mount(
    <ImportIssuer
      handleImport={handleImport}
      handleClose={handleClose}
      isOpen={true}
    />,
  );
  let textFields = component.find(TextField);
  let importButton = component.find(Button).get(1);

  expect(importButton.props.disabled).toEqual(true);
  expect(textFields.at(0).props().error).toEqual(false);
  expect(textFields.at(0).props().helperText).toEqual('');
  expect(textFields.at(1).props().error).toEqual(false);
  expect(textFields.at(1).props().helperText).toEqual('');

  act(() =>
    textFields
      .at(0)
      .props()
      .onChange({ target: { value: 'Lucky Coins' } }),
  );
  act(() =>
    textFields
      .at(1)
      .props()
      .onChange({ target: { value: '789' } }),
  );
  component.update();

  importButton = component.find(Button).get(1);
  expect(importButton.props.disabled).toEqual(false);
  textFields = component.find(TextField);
  expect(textFields.at(0).props().error).toEqual(false);
  expect(textFields.at(0).props().helperText).toEqual('');
  expect(textFields.at(1).props().error).toEqual(false);
  expect(textFields.at(1).props().helperText).toEqual('');

  act(() => importButton.props.onClick());

  expect(handleImport).toHaveBeenCalledWith('Lucky Coins', '789');
  expect(handleClose).toHaveBeenCalled();
});
