import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Button from '@mui/material/Button';
import { createTheme, ThemeProvider } from '@mui/material';
import Contacts, { ContactsWithoutContext } from '../Contacts';
import ImportContact from '../../components/ImportContact';

const contacts = [
  {
    id: 0,
    text: 'Self',
    depositBoardId: '123',
  },
  {
    id: 1,
    text: 'Friend',
    depositBoardId: '456',
  },
];

const board = {
  getValue: jest.fn(),
};

const services = {
  board,
};

const schemaActions = {
  createContact: jest.fn(),
};

const appTheme = createTheme({
  palette: {
    cancel: {
      main: '#595959',
    },
  },
});

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return (
    <ThemeProvider theme={appTheme}>
      <Component
        contacts={contacts}
        services={services}
        schemaActions={schemaActions}
        {...props}
      />
    </ThemeProvider>
  );
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

test('renders a loading indicator when contacts is empty', () => {
  const component = mount(<ContactsWithoutContext />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find('.Contact')).toHaveLength(0);
});

test('renders the contact cards', () => {
  const component = mount(<Contacts />);

  expect(component.find('.Contact')).toHaveLength(2);
  expect(component.find(CircularProgress)).toHaveLength(0);
});

test('cards display the correct data', () => {
  const component = mount(<Contacts />);

  const self = component.find('.Contact').at(0);
  expect(self.text()).toContain('Self');
  expect(self.text()).toContain('Board ID: (board:123)');
});

test('opens the import contact dialog when the button is clicked', async () => {
  const component = mount(<Contacts />);
  expect(component.find(ImportContact).props().isOpen).toBe(false);

  const importContactButton = component.find(Button).get(0);
  await act(async () => importContactButton.props.onClick());
  component.update();

  const importContact = component.find(ImportContact);
  expect(importContact.props().isOpen).toBe(true);

  await act(async () => importContact.props().handleClose());
  component.update();

  expect(component.find(ImportContact).props().isOpen).toBe(false);
});

test('shows the snackbar after successfully importing a contact', async () => {
  const component = mount(<Contacts />);
  const importContact = component.find(ImportContact);
  board.getValue.mockImplementation(id => id);
  let resolveContactP;
  const contactP = new Promise(res => (resolveContactP = res));
  schemaActions.createContact.mockImplementation(_ => contactP);

  expect(component.find(Snackbar).props().open).toBe(false);

  act(() => {
    importContact.props().handleImport('foo', '123');
  });
  component.update();

  expect(component.find(CircularProgress).length).toBe(1);

  await act(async () => resolveContactP());
  component.update();

  const snackbar = component.find(Snackbar);
  expect(board.getValue).toHaveBeenCalledWith('123');
  expect(schemaActions.createContact).toHaveBeenCalledWith('123', 'foo');
  expect(snackbar.props().open).toBe(true);
  expect(snackbar.props().message).toBe('Successfully imported contact.');
  expect(component.find(CircularProgress).length).toBe(0);
});

test('shows the snackbar when failing to import a contact', async () => {
  const component = mount(<Contacts />);
  const importContact = component.find(ImportContact);
  board.getValue.mockRejectedValue(new Error('Cannot find id'));

  await act(async () => importContact.props().handleImport('foo', '123'));
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBe(true);
  expect(snackbar.props().message).toBe('Failed to import contact.');
  expect(component.find(CircularProgress).length).toBe(0);
});
