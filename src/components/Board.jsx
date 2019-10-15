// eslint-disable react/no-array-index-key

import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Grid } from '@material-ui/core';

import IconMark from './IconMark';

const useStyles = makeStyles(theme => ({
  board: {
    margin: 'auto',
    width: theme.spacing(50),
    height: theme.spacing(50),
    // Size and center the icon.
    '& > *': {
      borderWidth: 1,
      borderColor: theme.palette.common.black,
      borderStyle: 'solid',
      position: 'relative',
    },
    // Size and center the icon.
    '& > * > *': {
      width: theme.spacing(15),
      height: theme.spacing(15),
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    // The grid design.
    '& :nth-child(1)': { borderLeft: 'none', borderTop: 'none' },
    '& :nth-child(2)': { borderTop: 'none' },
    '& :nth-child(3)': { borderRight: 'none', borderTop: 'none' },
    '& :nth-child(4)': { borderLeft: 'none' },
    '& :nth-child(6)': { borderRight: 'none' },
    '& :nth-child(7)': { borderLeft: 'none', borderBottom: 'none' },
    '& :nth-child(8)': { borderBottom: 'none' },
    '& :nth-child(9)': { borderRight: 'none', borderBottom: 'none' },
  },
  open: { cursor: 'pointer' },
  marked: { cursor: 'not-allowed' },
  mark: {},
}));

export default function Board({ board, gameOver, onClick }) {
  const classes = useStyles();

  return (
    <Grid container xs={12} spacing={0} className={classes.board}>
      {board.map((player, index) => (
        <Grid
          item
          xs={4}
          key={index}
          className={gameOver || player > 0 ? classes.marked : classes.open}
          onClick={() => onClick(index)}
        >
          <IconMark player={player} className={classes.mark} />
        </Grid>
      ))}
    </Grid>
  );
}
