import { mount } from 'enzyme';
import { act } from '@testing-library/react';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Issuers, { IssuersWithoutContext } from '../Issuers';
import MakePurse from '../../components/MakePurse';

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

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return (
    <Component
      pendingPurseCreations={pendingPurseCreations}
      issuers={issuers}
      {...props}
    />
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
