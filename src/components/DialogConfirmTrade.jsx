import React from 'react';

import Button from '@material-ui/core/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';

export default function DialogconfirmOffer({ open, onClick, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="responsive-dialog-title"
    >
      <DialogTitle id="responsive-dialog-title">Confirm Trade</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Would you like to confirm this trade?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClick(false)} color="primary">
          Reject
        </Button>
        <Button onClick={() => onClick(true)} color="primary" autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
