import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import { createTheme, ThemeProvider } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import Issuers, { IssuersWithoutContext } from '../Issuers';
import MakePurse from '../../components/MakePurse';
import ImportIssuer from '../../components/ImportIssuer';

jest.mock('../../components/MakePurse', () => () => 'MakePurse');

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

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

const pendingPurseCreations = new Set([0]);

const appTheme = createTheme({
  palette: {
    cancel: {
      main: '#595959',
    },
  },
});

const board = {
  getValue: jest.fn(),
};

const services = {
  board,
};
const schemaActions = {
  createIssuer: jest.fn(),
};

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <ThemeProvider theme={appTheme}>
        <Component
          pendingPurseCreations={pendingPurseCreations}
          issuers={issuers}
          schemaActions={schemaActions}
          services={services}
          {...props}
        />
      </ThemeProvider>
    );
  };

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders a loading indicator over pending transfers', () => {
  const component = mount(<Issuers />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(2);
});

test('renders a loading indicator when issuers is null', () => {
  const component = mount(<IssuersWithoutContext />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(1);
});

test('opens the make purse dialog when the button is clicked', async () => {
  const component = mount(<Issuers />);

  const firstMakePurseButton = component.find(Button).get(1);
  await act(async () => firstMakePurseButton.props.onClick());
  component.update();

  const makePurse = component.find(MakePurse);
  expect(makePurse.props().issuerId).toEqual(1);
});

test('opens the import issuer dialog when the button is clicked', async () => {
  const component = mount(<Issuers />);
  expect(component.find(ImportIssuer).props().isOpen).toBe(false);

  const importIssuersButton = component.find(Button).get(0);
  await act(async () => importIssuersButton.props.onClick());
  component.update();

  const importIssuer = component.find(ImportIssuer);
  expect(importIssuer.props().isOpen).toBe(true);

  await act(async () => importIssuer.props().handleClose());
  component.update();

  expect(component.find(ImportIssuer).props().isOpen).toBe(false);
});

test('shows the snackbar after successfully importing an issuer', async () => {
  const component = mount(<Issuers />);
  const importIssuer = component.find(ImportIssuer);
  board.getValue.mockImplementation(id => id);
  let resolveIssuerP;
  const issuerP = new Promise(res => (resolveIssuerP = res));
  schemaActions.createIssuer.mockImplementation(_ => issuerP);

  expect(component.find(Snackbar).props().open).toBe(false);

  act(() => {
    importIssuer.props().handleImport('foo', '123');
  });
  component.update();

  expect(component.find(CircularProgress).length).toBe(2);

  await act(async () => resolveIssuerP());
  component.update();

  const snackbar = component.find(Snackbar);
  expect(board.getValue).toHaveBeenCalledWith('123');
  expect(schemaActions.createIssuer).toHaveBeenCalledWith('123', 'foo');
  expect(snackbar.props().open).toBe(true);
  expect(snackbar.props().message).toBe('Successfully imported issuer.');
  expect(component.find(CircularProgress).length).toBe(1);
});

test('shows the snackbar when failing to import an issuer', async () => {
  const component = mount(<Issuers />);
  const importIssuer = component.find(ImportIssuer);
  board.getValue.mockRejectedValue(new Error('Cannot find id'));

  await act(async () => importIssuer.props().handleImport('foo', '123'));
  component.update();

  const snackbar = component.find(Snackbar);
  expect(snackbar.props().open).toBe(true);
  expect(snackbar.props().message).toBe('Failed to import issuer.');
  expect(component.find(CircularProgress).length).toBe(1);
});
