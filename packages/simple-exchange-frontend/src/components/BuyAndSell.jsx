import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { Button, Grid, Card, Tabs, Tab, InputLabel } from '@material-ui/core';

import AssetInput from './AssetInput';

import { useApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(theme => ({
  buy: {
    color: theme.palette.success.main,
  },
  sell: {
    color: theme.palette.warning.main,
  },
  message: {
    marginTop: theme.spacing(2),
    minHeight: theme.spacing(2),
  },
  buttons: {
    margin: theme.spacing(2),
  },
  btnBuy: {
    textTransform: 'none',
    fontSize: '1.5rem',
    color: '#FFFFFF',
    backgroundColor: theme.palette.success.main,
  },
  btnSell: {
    textTransform: 'none',
    fontSize: '1.5rem',
    color: '#FFFFFF',
    backgroundColor: theme.palette.warning.main,
  },
}));

/* eslint-disable complexity */

export default function BuyAndSell() {
  const classes = useStyles();
  const { state } = useApplicationContext();
  const {
    purses,
    inputPurse = {},
    outputPurse = {},
    inputAmount,
    outputAmount,
    connected,
  } = state;

  const [tab, setTab] = React.useState(0);

  const inputAmountError =
    inputAmount < 0 || (inputPurse && inputAmount > inputPurse.extent);
  const outputAmountError = outputAmount < 0;

  const pursesError =
    inputPurse &&
    outputPurse &&
    inputPurse.allegedName === outputPurse.allegedName;

  const hasError = pursesError || inputAmountError || outputAmountError;

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputAmount > 0 &&
    outputAmount > 0;

  const handleChangeTab = (event, newTab) => {
    setTab(newTab);
  };

  function getButtonClass() {
    return tab === 0 ? classes.btnBuy : classes.btnSell;
  }

  function getButtonLabel() {
    return tab === 0 ? 'Buy' : 'Sell';
  }

  function getExchangeRate(decimal) {
    if (isValid) {
      const exchangeRate = (outputAmount / inputAmount).toFixed(decimal);
      return `Exchange rate: 1 ${inputPurse.assayId} = ${exchangeRate} ${outputPurse.assayId}`;
    }
    return '';
  }

  return (
    <Card>
      <Tabs
        variant="fullWidth"
        disableRipple="true"
        value={tab}
        onChange={handleChangeTab}
      >
        <Tab label="Buy" className={tab === 0 && classes.buy} />
        <Tab label="Sell" className={tab === 1 && classes.sell} />
      </Tabs>

      <Grid container direction="column" alignItems="center" spacing={3}>
        <AssetInput
          title="Input"
          purses={purses}
          purse={inputPurse}
          amount={inputAmount}
          disabled={!connected}
        />

        <AssetInput
          title="Output"
          purses={purses}
          purse={outputPurse}
          amount={outputAmount}
          disabled={!connected}
        />

        <InputLabel className={classes.message}>
          {connected && isValid && getExchangeRate(4)}
        </InputLabel>
      </Grid>
      <div className={classes.buttons}>
        <Button
          variant="contained"
          fullWidth="true"
          className={getButtonClass()}
        >
          {getButtonLabel()}
        </Button>
      </div>
    </Card>
  );
}

/* eslint-enable complexity */
