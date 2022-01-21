/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useState } from 'react';
import { E } from '@agoric/eventual-send';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import { withApplicationContext } from '../contexts/Application';

// Exported for testing only.
export const MakePurseWithoutContext = ({
  issuerId,
  issuers,
  purses,
  handleClose,
  setPendingPurseCreations,
  schemaActions,
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
      await E(schemaActions).createPurse(issuer, petname);
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
        <div style={{ height: '68px' }}>
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
        </div>
      </DialogContent>
      <DialogActions>
        <Button color="cancel" onClick={close}>
          Cancel
        </Button>
        <Button disabled={!isPetnameValid || !petname} onClick={create}>
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

export default withApplicationContext(MakePurseWithoutContext, context => ({
  issuers: context.issuers,
  purses: context.purses,
  setPendingPurseCreations: context.setPendingPurseCreations,
  schemaActions: context.schemaActions,
}));
