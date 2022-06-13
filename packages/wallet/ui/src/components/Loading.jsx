import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import {
  ConnectionStatus,
  withApplicationContext,
} from '../contexts/Application';

const statusMessage = (status, url) => {
  switch (status) {
    case ConnectionStatus.Connecting:
      return `Connecting to ${url}...`;
    case ConnectionStatus.Disconnected:
      return `Disconnected from ${url}`;
    case ConnectionStatus.Error:
      return `Error connecting to ${url}`;
    default:
      return null;
  }
};

const Loading = ({ walletConnection, connectionStatus, ...rest }) => {
  const body = walletConnection ? (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {connectionStatus === ConnectionStatus.Connecting && (
        <CircularProgress sx={{ p: 1 }} {...rest} />
      )}
      <Typography sx={{ p: 1 }}>
        {statusMessage(connectionStatus, walletConnection.url)}
      </Typography>
    </div>
  ) : (
    <Typography sx={{ p: 1 }}>
      No configured wallet connection; see settings!
    </Typography>
  );

  return (
    <Paper elevation={2} {...rest}>
      {body}
    </Paper>
  );
};

export default withApplicationContext(Loading, context => ({
  connectionStatus: context.connectionStatus,
  walletConnection: context.walletConnection,
}));
