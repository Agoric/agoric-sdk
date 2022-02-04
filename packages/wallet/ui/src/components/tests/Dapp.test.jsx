import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import TextField from '@mui/material/TextField';
import Dapp from '../Dapp';

const dapps = [
  {
    id: 0,
    enable: true,
    petname: 'tokenPalace',
    origin: 'https://tokenpalace.app',
    actions: { setPetname: jest.fn() },
  },
  {
    id: 1,
    enable: false,
    petname: 'nftShop',
    origin: 'https://nftshop.app',
  },
];

const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
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

test('displays the dapp', () => {
  const component = mount(<Dapp dapp={dapps[0]} />);

  expect(component.text()).toContain(dapps[0].petname);
  expect(component.text()).toContain(dapps[0].origin);
});

test('displays an error message when trying to use a taken petname', () => {
  const component = mount(<Dapp dapp={dapps[0]} />);

  let textField = component.find(TextField);
  expect(textField.props().error).toEqual(false);
  expect(textField.props().helperText).toEqual(false);

  act(() => textField.props().onChange({ target: { value: 'nftShop' } }));
  component.update();

  textField = component.find(TextField);
  expect(textField.props().error).toEqual(true);
  expect(textField.props().helperText).toEqual('Petname already in use');
});

test('updates the petname when pressing enter on the textfield', () => {
  const component = mount(<Dapp dapp={dapps[0]} />);

  let textField = component.find(TextField);
  act(() =>
    textField.props().onChange({ target: { value: 'Token Palace 2' } }),
  );
  component.update();

  textField = component.find(TextField);
  act(() =>
    textField.props().onKeyDown({ key: 'Enter', stopPropagation: jest.fn() }),
  );

  expect(dapps[0].actions.setPetname).toHaveBeenCalledWith('Token Palace 2');
});
