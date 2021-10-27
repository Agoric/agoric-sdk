import { mount } from 'enzyme';
import CircularProgress from '@material-ui/core/CircularProgress';
import Purses, { PursesInternalDoNotImportOrElse } from '../Purses';
import PurseAmount from '../PurseAmount';

jest.mock('../PurseAmount', () => () => 'PurseAmount');

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

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component purses={purses} {...props} />;
};

jest.mock('../../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the purse amounts', () => {
  const component = mount(<Purses />);

  expect(component.find(PurseAmount)).toHaveLength(2);
});

test('renders a loading indicator when purses is null', () => {
  const component = mount(<PursesInternalDoNotImportOrElse />);

  expect(component.find(CircularProgress)).toHaveLength(1);
});
