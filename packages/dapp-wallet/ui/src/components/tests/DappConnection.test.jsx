import { mount } from 'enzyme';
import Chip from '@mui/material/Chip';
import Dapp from '../Dapp';
import DappConnection from '../DappConnection';

jest.mock('../Dapp', () => () => 'Dapp');
jest.mock('@agoric/eventual-send', () => ({
  E: obj =>
    new Proxy(obj, {
      get(target, propKey) {
        const method = target[propKey];
        return (...args) => method.apply(this, args);
      },
    }),
}));

const dapp = {
  id: 0,
  enable: false,
  actions: { enable: jest.fn() },
};

test('displays the dapp', () => {
  const component = mount(<DappConnection dapp={dapp} />);

  expect(component.find(Dapp)).toHaveLength(1);
});

test('enables the dapp when enable is clicked', () => {
  const component = mount(<DappConnection dapp={dapp} />);

  const enableChipButton = component.find(Chip);
  enableChipButton.props().onClick();

  expect(dapp.actions.enable).toHaveBeenCalled();
});
