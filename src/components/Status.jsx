import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import IconMark from './IconMark';

const useStyles = makeStyles(_theme => ({
  status: {
    display: 'inline-flex',
    'vertical-align': 'middle',
    'align-items': 'center',
  },
}));

export default function Status({ player, gameOver, winner }) {
  const classes = useStyles();

  function getMessage() {
    if (gameOver) {
      if (winner > 0) {
        return (
          <div className={classes.status}>
            <span>Player</span>
            <IconMark player={winner} />
            <span>wins!</span>
          </div>
        );
      }
      return <span>Draw!</span>;
    }
    return (
      <div className={classes.status}>
        <span>Current player:</span>
        <IconMark player={player} />
      </div>
    );
  }

  return (
    <Typography variant="h6">
      {getMessage()}
    </Typography>
  );
}
