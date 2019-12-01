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
import {
  changePurse,
  changeAmount,
  swapInputs,
  createOffer,
} from '../store/actions';

import { CONTRACT_ID } from '../utils/constants';

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
    inputPurse = {},
    outputPurse = {},
    inputAmount,
    outputAmount,
    connected,
  } = state;

  // const purses = [
  //   { name: 'Marketing', extent: 230, description: 'simolean' },
  //   { name: 'Operating Account', extent: 194, description: 'moola ' },
  //   { name: 'Savings', extent: 3500, description: 'moola ' },
  //   { name: 'Concert Tickets', extent: 64, description: 'tickets' },
  // ];

  const inputAmountError =
    inputAmount < 0 || (inputPurse && inputAmount > inputPurse.extent);
  const outputAmountError = outputAmount < 0;

  const pursesError =
    inputPurse && outputPurse && inputPurse.allegedName === outputPurse.allegedName;

  const hasError = pursesError || inputAmountError || outputAmountError;

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputAmount > 0 &&
    outputAmount > 0;

  function handleChangePurse(event, fieldNumber) {
    if (!purses) return;

    const purseName = event.target.value;
    const purse = purses.find(p => p.purseName === purseName);

    let freeVariable = null;
    if (inputAmount > 0 && outputAmount > 0) {
      freeVariable = fieldNumber;
    } else if (inputAmount > 0) {
      freeVariable = 0;
    } else if (outputAmount > 0) {
      freeVariable = 1;
    }

    dispatch(changePurse(purse, fieldNumber, freeVariable));
  }

  function handleChangeAmount(event, fieldNumber) {
    const amount = parseInt(event.target.value, 10);
    const freeVariable = fieldNumber;
    dispatch(changeAmount(amount, fieldNumber, freeVariable));
  }

  function handleswapInputs() {
    dispatch(swapInputs());
  }

  function getExchangeRate(decimal) {
    if (isValid) {
      const exchangeRate = (outputAmount / inputAmount).toFixed(decimal);
      return `Exchange rate: 1 ${inputPurse.assayId} = ${exchangeRate} ${outputPurse.assayId}`;
    }
    return '';
  }

  function handleSwap() {
    dispatch(
      createOffer(
        CONTRACT_ID,
        inputAmount,
        outputAmount,
        inputPurse,
        outputPurse,
      ),
    );
  }

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
          onPurseChange={event => handleChangePurse(event, 0)}
          onAmountChange={event => handleChangeAmount(event, 0)}
          purse={inputPurse}
          amount={inputAmount}
          disabled={!connected}
          purseError={pursesError}
          amountError={inputAmountError}
        />

        <IconButton
          size="medium"
          onClick={handleswapInputs}
          disabled={!connected}
        >
          <ArrowDownIcon />
        </IconButton>

        <AssetInput
          title="Output"
          purses={purses}
          onPurseChange={event => handleChangePurse(event, 1)}
          onAmountChange={event => handleChangeAmount(event, 1)}
          purse={outputPurse}
          amount={outputAmount}
          disabled={!connected}
          purseError={pursesError}
          amountError={outputAmountError}
        />
        <InputLabel className={classes.message}>
          {connected && isValid && getExchangeRate(4)}
        </InputLabel>
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
