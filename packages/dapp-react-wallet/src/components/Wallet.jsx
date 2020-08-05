import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Grid, Paper, Typography } from '@material-ui/core';

import Purses from './Purses';
import Inbox from './Inbox';

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
  title: {
    padding: theme.spacing(0, 0, 4),
    [theme.breakpoints.down('xs')]: {
      display: 'none',      
    },
  },
  aside: {
    borderRightColor: theme.palette.divider,
    borderRightStyle: 'solid',
    borderRightWidth: 1,
  },
}));

export default function Wallet() {
  const classes = useStyles();

  return (
    <Paper className={classes.paper}>
      <Typography
        component="h1"
        variant="h4"
        align="center"
        className={classes.title}
      >
        Simple Agoric Wallet
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} md={4} className={classes.aside}>
          <Purses />
        </Grid>
        <Grid item xs={12} md={8}>
          <Inbox />
        </Grid>
      </Grid>
    </Paper>
  );
}
