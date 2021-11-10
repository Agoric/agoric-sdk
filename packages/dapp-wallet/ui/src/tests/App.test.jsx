import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';
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

const connectionState = 'connecting';
const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component connectionState={connectionState} {...props} />;
};
jest.mock('../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the dashboard view', () => {
  const component = mount(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );

  expect(component.find(Dashboard)).toHaveLength(1);
});

test('renders the dapps view', () => {
  const component = mount(
    <MemoryRouter initialEntries={['/dapps']}>
      <App />
    </MemoryRouter>,
  );

  expect(component.find(Dapps)).toHaveLength(1);
});

test('renders the contacts view', () => {
  const component = mount(
    <MemoryRouter initialEntries={['/contacts']}>
      <App />
    </MemoryRouter>,
  );

  expect(component.find(Contacts)).toHaveLength(1);
});

test('renders the issuers view', () => {
  const component = mount(
    <MemoryRouter initialEntries={['/issuers']}>
      <App />
    </MemoryRouter>,
  );

  expect(component.find(Issuers)).toHaveLength(1);
});
