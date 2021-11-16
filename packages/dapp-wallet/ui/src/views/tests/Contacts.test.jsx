import { mount } from 'enzyme';
import CircularProgress from '@mui/material/CircularProgress';
import Contacts, { ContactsWithoutContext } from '../Contacts';

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

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component contacts={contacts} {...props} />;
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

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
