import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  Grid,
  Paper,
  Typography,
  IconButton,
  InputLabel,
} from '@material-ui/core';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';

import AssetInput from './AssetInput';
import Steps from './Steps';

import { useApplicationContext } from '../contexts/Application';
import { changePurse, swapPurses, changeAmount } from '../store/actions';

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
  grid: {
    padding: theme.spacing(2),
  },
  message: {
    marginTop: theme.spacing(2),
    minHeight: theme.spacing(2),
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    marginTop: theme.spacing(3),
  },
}));

export default function Swap() {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const {
    purses,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    isValid,
    connected,
  } = state;

  function handleChangePurse(event, isInput) {
    dispatch(changePurse(event.target.value, isInput));
  }

  function handleSwapPurses(event, isInput) {
    dispatch(swapPurses(event.target.value, isInput));
  }

  function handleChangeAmount(event, isInput) {
    dispatch(changeAmount(event.target.value, isInput));
  }

  function handleSwap(event) {}

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Swap
      </Typography>
            
      <Steps
        connected={connected}
        inputPurse={inputPurse}
        outputPurse={outputPurse}
        inputAmount={inputAmount}
        outputAmount={outputAmount}
      />
      
      <Grid
        container
        direction="column"
        alignItems="center"
        spacing={3}
        className={classes.grid}
      >
        <AssetInput
          title="Input"
          purses={purses}
          onPurseChange={event => handleChangePurse(event, true)}
          onAmountChange={event => handleChangeAmount(event, true)}
          purse={inputPurse}
          amount={inputAmount}
          disabled={!connected}
        />

        <IconButton
          size="medium"
          onClick={handleSwapPurses}
          disabled={!connected}
        >
          <ArrowDownIcon />
        </IconButton>

        <AssetInput
          title="Output"
          purses={purses}
          onPurseChange={event => handleChangePurse(event, false)}
          onAmountChange={event => handleChangeAmount(event, false)}
          purse={outputPurse}
          amount={outputAmount}
          disabled={!connected}
        />
        {/*        <InputLabel className={classes.message}>
          {exchangeRate &&
            `${t('exchangeRate')} ${inputSymbol} = ${amountFormatter(
              exchangeRate,
              18,
              4,
              false,
            )} ${outputSymbol}`}
        </InputLabel>
        */}
      </Grid>
      <div className={classes.buttons}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={!connected || !isValid}
          onClick={handleSwap}
        >
          Swap
        </Button>
      </div>
    </Paper>
  );
}
