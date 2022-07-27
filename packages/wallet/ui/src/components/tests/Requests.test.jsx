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

const offers = [
  { id: 3, status: 'accept' },
  { id: 6, status: 'decline' },
  { id: 7 },
  { id: 8 },
  { id: 9, status: 'accept' },
];

const dapps = [
  { enable: false, id: 2 },
  { enable: true, id: 5 },
];

const payments = [
  { brand: 'Moola', id: 4 },
  { brand: 'Brouzouf', id: 1 },
];

const pendingOffers = new Set([3]);
const declinedOffers = new Set([6]);
const closedOffers = new Set([7]);

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return (
      <Component
        purses={purses}
        offers={offers}
        dapps={dapps}
        payments={payments}
        pendingOffers={pendingOffers}
        declinedOffers={declinedOffers}
        closedOffers={closedOffers}
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

test('renders fresh offers', () => {
  const component = mount(<Requests />);

  expect(component.find(Offer).length).toEqual(3);
});

test('renders unapproved dapps', () => {
  const component = mount(<Requests />);

  expect(component.find(DappConnection).length).toEqual(1);
});
