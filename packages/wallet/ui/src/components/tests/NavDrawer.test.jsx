import { act } from '@testing-library/react';
import { mount } from 'enzyme';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import NavDrawer from '../NavDrawer';

jest.mock('../NavMenu', () => () => 'NavMenu');

test('shows the drawer when the button is clicked', () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  const component = mount(<NavDrawer />);
  act(() => component.find(IconButton).props().onClick());
  component.update();

  expect(component.find(Drawer).props().open).toEqual(true);
});

test('hides the button on large viewports', () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  const component = mount(<NavDrawer />);

  expect(component.find(IconButton).length).toEqual(0);
});
