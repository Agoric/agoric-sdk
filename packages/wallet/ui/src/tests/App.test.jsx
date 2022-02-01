import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material';
import App from '../App';
import Dashboard from '../views/Dashboard';
import Dapps from '../views/Dapps';
import Contacts from '../views/Contacts';
import Issuers from '../views/Issuers';

jest.mock('../components/WalletConnection', () => () => 'WalletConnection');
jest.mock('../views/Dashboard', () => () => 'Dashboard');
jest.mock('../views/Dapps', () => () => 'Dapps');
jest.mock('../views/Contacts', () => () => 'Contacts');
jest.mock('../views/Issuers', () => () => 'Issuers');
jest.mock('@cosmjs/launchpad', () => () => {
  jest.mock();
});

const connectionState = 'connecting';
const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component connectionState={connectionState} {...props} />;
};

jest.mock('../contexts/Application', () => {
  return { withApplicationContext };
});

const appTheme = createTheme({
  appBarHeight: '64px',
  navMenuWidth: '240px',
});

test('renders the dashboard view', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(component.find(Dashboard)).toHaveLength(1);
});

test('renders the dapps view', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={['/dapps']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(component.find(Dapps)).toHaveLength(1);
});

test('renders the contacts view', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={['/contacts']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(component.find(Contacts)).toHaveLength(1);
});

test('renders the issuers view', () => {
  const component = mount(
    <ThemeProvider theme={appTheme}>
      <MemoryRouter initialEntries={['/issuers']}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );

  expect(component.find(Issuers)).toHaveLength(1);
});
