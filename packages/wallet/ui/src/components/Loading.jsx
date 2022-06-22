import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';

import {
  ConnectionStatus,
  withApplicationContext,
} from '../contexts/Application';

const statusMessage = (status, url, defaultMessage) => {
  switch (status) {
    case ConnectionStatus.Connecting:
      return `Connecting to ${url}`;
    case ConnectionStatus.Disconnected:
      return `Disconnected from ${url}`;
    case ConnectionStatus.Error:
      return `Error connecting to ${url}`;
    default:
      return defaultMessage;
  }
};

const Loading = ({ walletConnection, connectionStatus, defaultMessage }) => {
  const graphic = (() => {
    if (connectionStatus === ConnectionStatus.Error) {
      return <ErrorIcon color="error" fontSize="large" />;
    }
    if (connectionStatus === ConnectionStatus.Disconnected) {
      return <WarningIcon color="warning" fontSize="large" />;
    }
    return <CircularProgress size={48} sx={{ p: 1 }} />;
  })();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
      }}
    >
      {walletConnection ? (
        <>
          {graphic}
          <Typography className="text-gray" sx={{ p: 1 }}>
            {statusMessage(connectionStatus, walletConnection, defaultMessage)}
          </Typography>
        </>
      ) : (
        <>
          <WarningIcon color="warning" fontSize="large" />)
          <Typography sx={{ p: 1 }}>
            No configured wallet connection; see settings!
          </Typography>
        </>
      )}
    </div>
  );
};

export default withApplicationContext(Loading, context => ({
  connectionStatus: context.connectionStatus,
  walletConnection: context.walletConnection,
}));
