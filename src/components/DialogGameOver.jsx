import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@material-ui/core';

import IconMark from './IconMark';

const useStyles = makeStyles(_theme => ({
  title: {
    display: 'inline-flex',
    'vertical-align': 'baseline',
    'align-items': 'center',
  },
}));

export default function GameoverDialog({ open, winner, onClick, onClose }) {
  const classes = useStyles();

  function getTitle() {
    if (winner > 0) {
      return (
        <div className={classes.title}>
          <span>Player</span>
          <IconMark player={winner} />
          <span>wins!</span>
        </div>
      );
    }
    return <span>Draw!</span>;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="responsive-dialog-title"
    >
      <DialogTitle id="responsive-dialog-title">
        {getTitle()}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          Would you like to start a new game?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClick(false)} color="primary">
          No
        </Button>
        <Button onClick={() => onClick(true)} color="primary" autoFocus>
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
