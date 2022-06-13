import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';

import { withApplicationContext } from '../contexts/Application';

const Loading = ({ wantConnection, walletConnection, ...rest }) => {
  let body;
  if (walletConnection) {
    const { url } = walletConnection || {};
    body = (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
        }}
      >
        {wantConnection && <CircularProgress sx={{ p: 1 }} {...rest} />}
        <Typography sx={{ p: 1 }}>
          {wantConnection ? (
            <>Connecting to {url}...</>
          ) : (
            <>Disconnected from {url}</>
          )}
        </Typography>
      </div>
    );
  } else {
    body = (
      <Typography sx={{ p: 1 }}>
        No configured wallet connection; see settings!
      </Typography>
    );
  }
  return (
    <Paper elevation={2} {...rest}>
      {body}
    </Paper>
  );
};

export default withApplicationContext(Loading, context => ({
  wantConnection: context.wantConnection,
  walletConnection: context.walletConnection,
}));
