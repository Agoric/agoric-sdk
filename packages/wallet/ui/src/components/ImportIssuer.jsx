/* eslint-disable import/no-extraneous-dependencies */
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import { withApplicationContext } from '../contexts/Application';

// Exported for testing only.
export const ImportIssuerWithoutContext = ({
  isOpen,
  issuers,
  handleClose,
  handleImport,
}) => {
  const [petname, setPetname] = useState('');
  const [isPetnameValid, setIsPetnameValid] = useState(true);
  const handlePetnameChange = e => {
    setPetname(e.target.value);
  };
  useEffect(() => {
    if (issuers?.find(({ issuerPetname }) => issuerPetname === petname)) {
      setIsPetnameValid(false);
    } else {
      setIsPetnameValid(true);
    }
  }, [petname]);

  const [boardId, setBoardId] = useState('');
  const [isBoardIdValid, setIsBoardIdValid] = useState(true);
  const handleBoardIdChange = e => {
    setBoardId(e.target.value);
  };
  useEffect(() => {
    if (issuers?.find(({ issuerBoardId }) => issuerBoardId === boardId)) {
      setIsBoardIdValid(false);
    } else {
      setIsBoardIdValid(true);
    }
  }, [boardId]);

  const close = () => {
    setPetname('');
    setBoardId('');
    handleClose();
  };

  const doImport = () => {
    handleImport(petname, boardId);
    setPetname('');
    setBoardId('');
    handleClose();
  };

  const content = (
    <>
      <DialogTitle>Import Issuer</DialogTitle>
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
        <div style={{ height: '68px' }}>
          <TextField
            error={!isBoardIdValid}
            margin="dense"
            label="Board ID"
            fullWidth
            value={boardId}
            onChange={handleBoardIdChange}
            helperText={isBoardIdValid ? '' : 'Board ID already imported'}
            variant="standard"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">board0</InputAdornment>
              ),
            }}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button color="cancel" onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={!isPetnameValid || !petname || !isBoardIdValid || !boardId}
          onClick={() => doImport(petname, boardId)}
        >
          Import
        </Button>
      </DialogActions>
    </>
  );

  return (
    <Dialog open={isOpen} onClose={close}>
      {content}
    </Dialog>
  );
};

export default withApplicationContext(ImportIssuerWithoutContext, context => ({
  issuers: context.issuers,
}));
