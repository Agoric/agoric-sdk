import { mount } from 'enzyme';
import CircularProgress from '@material-ui/core/CircularProgress';
import Button from '@material-ui/core/Button';
import Purses, { PursesInternalDoNotImportOrElse } from '../Purses';
import PurseAmount from '../PurseAmount';

jest.mock('../PurseAmount', () => () => 'PurseAmount');

jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

jest.mock('@agoric/ui-components', () => ({
  parseAsValue: str => new BigInt(str),
}));

const purses = [
  {
    id: 0,
    brandPetname: 'Moola',
    pursePetname: 'Test currency',
    currentAmount: { value: 62000000n },
    displayInfo: {
      assetKind: 'nat',
      decimalPlaces: 6,
    },
  },
  {
    id: 1,
    brandPetname: 'TestNFT',
    pursePetname: 'Non-fungible testing tokens',
    currentAmount: { value: ['Test token 1', 'Test token 2'] },
    displayInfo: {
      assetKind: 'set',
    },
  },
];

const pendingTransfers = new Set([0]);

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return (
    <Component purses={purses} pendingTransfers={pendingTransfers} {...props} />
  );
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the purse amounts', () => {
  const component = mount(<Purses />);

  expect(component.find(PurseAmount)).toHaveLength(2);
});

test('renders a loading indicator over pending transfers', () => {
  const component = mount(<Purses />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(1);
});

test('renders a loading indicator when purses is null', () => {
  const component = mount(<PursesInternalDoNotImportOrElse />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Button)).toHaveLength(0);
});
