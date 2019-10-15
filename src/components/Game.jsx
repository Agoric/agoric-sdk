import React, { useEffect, useState, useContext } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Grid, Paper } from '@material-ui/core';

import { ApplicationContext } from '../contexts/Application';
import { newGame, playTurn } from '../store/actions';
import { getWinner, isBoardFull } from '../utils/checks';

import Board from './Board';
import Status from './Status';
import DialogGameOver from './DialogGameOver';

const useStyles = makeStyles(theme => ({
  paper: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(3) * 2)]: {
      marginTop: theme.spacing(6),
      marginBottom: theme.spacing(6),
      padding: theme.spacing(3),
    },
  },
}));

export default function Game() {
  const classes = useStyles();
  const { state, dispatch } = useContext(ApplicationContext);
  const { board, player } = state;

  const [gameOver, setGameOver] = useState(0);
  const [winner, setWinner] = useState(0);
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const checkWinner = getWinner(board, player);
    const checkIsBoardFull = isBoardFull(board);
    if (checkWinner > 0 || checkIsBoardFull) {
      setGameOver(true);
      setWinner(checkWinner);
      setDialogOpen(true);
    }
  }, [board, player]);

  function handleBoardClick(index) {
    dispatch(playTurn(board, player, index));
  }

  function handleDialogClick(answer) {
    if (answer) {
      dispatch(newGame());
    }
    setDialogOpen(false);
  }

  function handleDialogClose() {
    setDialogOpen(false);
  }

  return (
    <Paper className={classes.paper}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Board board={board} gameOver={gameOver} onClick={handleBoardClick} />
        </Grid>
        <Grid item xs={12} align="center">
          <Status player={player} gameOver={gameOver} winner={winner} />
        </Grid>
      </Grid>
      <DialogGameOver
        open={isDialogOpen}
        winner={winner}
        onClick={handleDialogClick}
        onClose={handleDialogClose}
      />
    </Paper>
  );
}
