import { mount } from 'enzyme';
import { createTheme, ThemeProvider } from '@material-ui/core/styles';
import AppBar from '../AppBar';

jest.mock('../WalletConnection', () => () => 'WalletConnection');
jest.mock('../NavMenu', () => () => 'NavMenu');

test('renders the nav drawer button only on small viewports', () => {
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
  const theme = createTheme();
  let component = mount(
    <ThemeProvider theme={theme}>
      <AppBar />
    </ThemeProvider>,
  );

  expect(component.find('.navMenuButton')).toHaveLength(0);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => {
      return {
        matches: query === '(max-width:959.95px)',
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
  component = mount(
    <ThemeProvider theme={theme}>
      <AppBar />
    </ThemeProvider>,
  );

  expect(component.find('.navMenuButton')).toHaveLength(1);
});
