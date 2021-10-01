import { render, screen } from '@testing-library/react';
import App from './App';
import { ApplicationContext } from './contexts/Application';

jest.mock('./store.js', () => {});
jest.mock('./components/WalletConnection', () => () => 'WalletConnection');

test('renders the wallet connection status', () => {
  const state = { connectionState: 'connecting' };
  render(
    <ApplicationContext.Provider value={{ state }}>
      <App />
    </ApplicationContext.Provider>,
  );

  const connectionStatus = screen.getByText(/Connection Status:/i);
  expect(connectionStatus.textContent).toContain('connecting');
});
