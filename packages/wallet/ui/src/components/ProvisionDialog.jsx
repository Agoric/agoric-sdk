import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { useState } from 'react';

import { withApplicationContext } from '../contexts/Application';

const ProvisionDialog = ({ onClose, open, address, href, keplrConnection }) => {
  const [inProgress, setInProgress] = useState(false);
  const provisionWallet = async () => {
    const {
      signers: { interactiveSigner },
    } = keplrConnection;
    if (!interactiveSigner) {
      throw new Error(
        'Cannot sign a transaction in read only mode, connect to keplr.',
      );
    }
    setInProgress(true);
    await interactiveSigner.submitProvision();
    setInProgress(false);
  };

  const prompt = (
    <div>
      <DialogContentText>
        <b>Network Config</b>:{' '}
        <Link href={href} underline="none" color="rgb(0, 176, 255)">
          {href}
        </Link>
      </DialogContentText>
      <DialogContentText sx={{ pt: 2 }}>
        <b>Wallet Address:</b> {address}
      </DialogContentText>
      <DialogContentText sx={{ pt: 2 }}>
        There is no smart wallet provisioned for this address yet. A fee of{' '}
        <b>10 BLD</b> is required to create one.
      </DialogContentText>
    </div>
  );

  const progressIndicator = (
    <Box>
      <Box
        sx={{
          margin: 'auto',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
      <DialogContentText sx={{ pt: 2 }}>
        Please approve the transaction in Keplr.
      </DialogContentText>
    </Box>
  );

  return (
    <Dialog open={open}>
      <DialogTitle>
        {inProgress ? 'Creating' : 'Create a'} Smart Wallet
      </DialogTitle>
      <DialogContent>{inProgress ? progressIndicator : prompt}</DialogContent>
      {!inProgress && (
        <DialogActions>
          <Button color="cancel" onClick={onClose}>
            Change Connection
          </Button>
          <Button onClick={provisionWallet}>Create</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default withApplicationContext(ProvisionDialog, context => ({
  keplrConnection: context.keplrConnection,
}));
