import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import {
  ConnectionStatus,
  withApplicationContext,
} from '../contexts/Application';

const statusMessage = (status, url, wantConnection) => {
  switch (status) {
    case ConnectionStatus.Connecting:
      return `Connecting to ${url}...`;
    case ConnectionStatus.Disconnected:
      return wantConnection ? null : `Disconnected from ${url}`;
    case ConnectionStatus.Error:
      return `Error connecting to ${url}`;
    default:
      return null;
  }
};

const Loading = ({
  walletConnection,
  wantConnection,
  connectionStatus,
  ...rest
}) => {
  if (!walletConnection) {
    return (
      <Typography sx={{ p: 1 }}>
        No configured wallet connection; see settings!
      </Typography>
    );
  }
  const sm = statusMessage(
    connectionStatus,
    walletConnection.url,
    wantConnection,
  );
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      {wantConnection && <CircularProgress sx={{ p: 1 }} {...rest} />}
      {sm && <Typography sx={{ p: 1 }}>{sm}</Typography>}
    </div>
  );
};

export default withApplicationContext(Loading, context => ({
  connectionStatus: context.connectionStatus,
  walletConnection: context.walletConnection,
  wantConnection: context.wantConnection,
}));
