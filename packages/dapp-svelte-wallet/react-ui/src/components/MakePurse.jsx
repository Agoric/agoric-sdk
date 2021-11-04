/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useState } from 'react';
import { E } from '@agoric/eventual-send';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import Snackbar from '@material-ui/core/Snackbar';
import { withApplicationContext } from '../contexts/Application';

// Exported for testing only.
export const MakePurseInternalDoNotImport = ({
  issuerId,
  issuers,
  purses,
  handleClose,
  setPendingPurseCreations,
  walletBridge,
}) => {
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const handleCloseSnackbar = _ => {
    setIsSnackbarOpen(false);
  };
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const showSnackbar = msg => {
    setSnackbarMessage(msg);
    setIsSnackbarOpen(true);
  };
  const [petname, setPetname] = useState('');
  const [isPetnameValid, setIsPetnameValid] = useState(true);
  const handlePetnameChange = e => {
    setPetname(e.target.value);
  };

  useEffect(() => {
    if (purses?.find(({ pursePetname }) => pursePetname === petname)) {
      setIsPetnameValid(false);
    } else {
      setIsPetnameValid(true);
    }
  }, [petname]);

  const close = () => {
    setPetname('');
    handleClose();
  };

  const issuer = issuers?.find(({ id }) => issuerId === id) ?? null;

  const create = async () => {
    setPendingPurseCreations({ issuerId, isPending: true });
    close();
    try {
      await E(walletBridge).makeEmptyPurse(issuer?.issuerPetname, petname);
      showSnackbar('Successfully created purse.');
    } catch (e) {
      showSnackbar('Failed to create purse.');
    } finally {
      setPendingPurseCreations({ issuerId, isPending: false });
    }
  };

  const content = issuer && (
    <>
      <DialogTitle>Create New Purse for {issuer.issuerPetname}</DialogTitle>
      <DialogContent>
        <TextField
          error={!isPetnameValid}
          autoFocus
          margin="dense"
          label="Petname"
          fullWidth
          value={petname}
          onChange={handlePetnameChange}
          helperText={isPetnameValid ? '' : 'Petname already exists'}
          variant="standard"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button
          disabled={!isPetnameValid || !petname}
          color="primary"
          onClick={create}
        >
          Create
        </Button>
      </DialogActions>
    </>
  );
  return (
    <>
      <Dialog open={issuer !== null} onClose={close}>
        {content}
      </Dialog>
      <Snackbar
        open={isSnackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </>
  );
};

export default withApplicationContext(
  MakePurseInternalDoNotImport,
  context => ({
    issuers: context.issuers,
    purses: context.purses,
    setPendingPurseCreations: context.setPendingPurseCreations,
    walletBridge: context.walletBridge,
  }),
);
