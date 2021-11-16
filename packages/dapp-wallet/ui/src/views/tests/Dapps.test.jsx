import { mount } from 'enzyme';
import CircularProgress from '@mui/material/CircularProgress';
import Dapps, { DappsWithoutContext } from '../Dapps';
import Dapp from '../../components/Dapp';

const dapps = [
  {
    id: 0,
    enable: true,
  },
  {
    id: 1,
    enable: false,
  },
  {
    id: 2,
    enable: true,
  },
];

const withApplicationContext = (Component, _) => ({ ...props }) => {
  return <Component dapps={dapps} {...props} />;
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

test('renders a loading indicator while loading', () => {
  const component = mount(<DappsWithoutContext />);

  expect(component.find(CircularProgress)).toHaveLength(1);
  expect(component.find(Dapp)).toHaveLength(0);
});

test('displays the dapps', () => {
  const component = mount(<Dapps />);

  expect(component.find(Dapp)).toHaveLength(2);
});

test('renders a message when there are no dapps', () => {
  const component = mount(<Dapps dapps={[]} />);

  expect(component.text()).toContain('No Dapps');
});
