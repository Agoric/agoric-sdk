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

const steps = {
  INITIAL: 0,
  AWAITING_APPROVAL: 1,
  IN_PROGRESS: 2,
};

const errors = {
  NO_SIGNER: 'Cannot sign a transaction in read only mode, connect to keplr.',
};

// TODO: Read this from the chain via rpc.
const CREATION_FEE = '10 BLD';

const ProvisionDialog = ({ onClose, open, address, href, keplrConnection }) => {
  const [currentStep, setCurrentStep] = useState(steps.INITIAL);
  const [error, setError] = useState(null);

  const provisionWallet = async signer => {
    setError(null);
    setCurrentStep(steps.AWAITING_APPROVAL);
    try {
      await signer.submitProvision();
    } catch (e) {
      setCurrentStep(steps.INITIAL);
      setError(e.message);
      return;
    }
    setCurrentStep(steps.IN_PROGRESS);
  };

  const handleCreateButtonClicked = () => {
    const {
      signers: { interactiveSigner },
    } = keplrConnection;
    if (!interactiveSigner) {
      setError(errors.NO_SIGNER);
      return;
    }

    provisionWallet(interactiveSigner);
  };

  const progressIndicator = text => (
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
      <DialogContentText sx={{ pt: 2 }}>{text}</DialogContentText>
    </Box>
  );

  const content = (() => {
    switch (currentStep) {
      case steps.INITIAL:
        return (
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
              There is no smart wallet provisioned for this address yet. A fee
              of <b>{CREATION_FEE}</b> is required to create one.
            </DialogContentText>
          </div>
        );
      case steps.AWAITING_APPROVAL:
        return progressIndicator('Please approve the transaction in Keplr.');
      case steps.IN_PROGRESS:
        return progressIndicator('Awaiting smart wallet creation...');
      default:
        return <></>;
    }
  })();

  return (
    <Dialog open={open}>
      <DialogTitle>
        {currentStep === steps.INITIAL ? 'Create a' : 'Creating'} Smart Wallet
      </DialogTitle>
      <DialogContent>
        {content}
        {error && (
          <DialogContentText sx={{ pt: 2 }} color="primary">
            {error}
          </DialogContentText>
        )}
      </DialogContent>
      {currentStep === steps.INITIAL && (
        <DialogActions>
          <Button color="cancel" onClick={onClose}>
            Change Connection
          </Button>
          <Button onClick={handleCreateButtonClicked}>Create</Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default withApplicationContext(ProvisionDialog, context => ({
  keplrConnection: context.keplrConnection,
}));
