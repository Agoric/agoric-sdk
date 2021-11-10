import { mount } from 'enzyme';
import Requests from '../Requests';
import Payment from '../Payment';
import Offer from '../Offer';
import DappConnection from '../DappConnection';

jest.mock('../Payment', () => () => 'Payment');
jest.mock('../Offer', () => () => 'Offer');
jest.mock('../DappConnection', () => () => 'DappConnection');

const purses = [
  {
    id: 0,
    brand: 'Moola',
    brandPetname: 'Moola',
    pursePetname: 'Test currency',
    currentAmount: { value: 62000000n },
    depositBoardId: '123',
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
    actions: {
      send: jest.fn(),
    },
  },
];

const offers = [{ id: 3 }];

const dapps = [
  { enable: false, id: 2 },
  { enable: true, id: 5 },
];

const payments = [
  { brand: 'Moola', id: 4 },
  { brand: 'Brouzouf', id: 1 },
];

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return (
    <Component
      purses={purses}
      offers={offers}
      dapps={dapps}
      payments={payments}
      {...props}
    />
  );
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders non-autodeposit payments', () => {
  const component = mount(<Requests />);

  expect(component.find(Payment).length).toEqual(1);
});

test('renders offers', () => {
  const component = mount(<Requests />);

  expect(component.find(Offer).length).toEqual(1);
});

test('renders unapproved dapps', () => {
  const component = mount(<Requests />);

  expect(component.find(DappConnection).length).toEqual(1);
});
