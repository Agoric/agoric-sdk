import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('../components/WalletConnection', () => () => 'WalletConnection');

let connectionState = 'connecting';
const withApplicationContext =
  (Component, _) =>
  ({ ...props }) => {
    return <Component connectionState={connectionState} {...props} />;
  };
jest.mock('../contexts/Application', () => {
  return { withApplicationContext };
});

test('renders the wallet connection status', () => {
  render(<App />);

  const connectionStatus = screen.getByText(/Connection Status:/i);
  expect(connectionStatus.textContent).toContain(connectionState);
});
