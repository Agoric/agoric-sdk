import React from 'react';

import { makeStyles, withStyles } from '@material-ui/core/styles';
import { green, red } from '@material-ui/core/colors';
import {
  Box,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Typography,
} from '@material-ui/core';
import AutoswapIcon from '@material-ui/icons/SwapHorizontalCircle';
import ClearIcon from '@material-ui/icons/Clear';
import CheckIcon from '@material-ui/icons/Check';

import { useApplicationContext } from '../contexts/Application';

import { declineOffer, acceptOffer } from '../store/actions';

const useStyles = makeStyles(theme => ({
  icon: {
    margin: theme.spacing(1),
  },
  buttons: {
    '& button ~ button': {
      marginLeft: theme.spacing(1),
    },
  },
}));

const RedIconButton = withStyles(theme => ({
  root: {
    color: theme.palette.getContrastText(red[500]),
    backgroundColor: red[500],
    '&:hover': {
      backgroundColor: red[700],
    },
  },
}))(IconButton);

const GreenIconButton = withStyles(theme => ({
  root: {
    color: theme.palette.getContrastText(green[500]),
    backgroundColor: green[500],
    '&:hover': {
      backgroundColor: green[700],
    },
  },
}))(IconButton);

const RedChip = withStyles(theme => ({
  root: {
    width: theme.spacing(10),
    color: red[800],
    borderColor: red[800],
  },
}))(Chip);

const GreenChip = withStyles(theme => ({
  root: {
    width: theme.spacing(10),
    color: green[800],
    borderColor: green[800],
  },
}))(Chip);

export default function Inbox() {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const { inbox } = state;

  function formatDate(date) {
    const options = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };
    return new Date(date).toLocaleDateString('en-US', options);
  }

  function handleDecline(date) {
    dispatch(declineOffer(date));
  }

  function handleAccept(date) {
    dispatch(acceptOffer(date));
  }

  return (
    <>
      <Typography variant="h6">Transactions</Typography>
      {Array.isArray(inbox) && inbox.length > 0 ? (
        <List>
          {inbox.map(
            ({
              instanceId,
              date,
              purseName0,
              purseName1,
              issuerPetname0,
              issuerPetname1,
              issuerId0,
              issuerId1,
              extent0,
              extent1,
              status,
            }) => (
              <ListItem key={date} value={date} divider>
                <ListItemIcon>
                  <AutoswapIcon edge="start" className={classes.icon} />
                </ListItemIcon>
                <Grid container direction="column">
                  <Grid item>
                    <Typography variant="body2" display="block">
                      {`${instanceId} - ${formatDate(date)}`}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="body1">
                      Pay&nbsp;
                      <Box component="span" fontWeight={800}>
                        {extent0}
                        &nbsp;
                        {issuerPetname0 || '??'}
                        &nbsp;
                      </Box>
                      {issuerId0 && <i>({issuerId0})&nbsp;</i>}
                      from&nbsp;
                      {purseName0}
                    </Typography>
                    <Typography variant="body1">
                      to receive&nbsp;
                      <Box component="span" fontWeight={800}>
                        {extent1}
                        &nbsp;
                        {issuerPetname1 || '??'}
                        &nbsp;
                      </Box>
                      {issuerId1 && <i>({issuerId1})&nbsp;</i>}
                      into&nbsp;
                      {purseName1}
                    </Typography>
                  </Grid>
                </Grid>
                <ListItemSecondaryAction className={classes.buttons}>
                  {status === 'decline' && (
                    <RedChip variant="outlined" label="Declined" />
                  )}
                  {status === 'accept' && (
                    <GreenChip variant="outlined" label="Accepted" />
                  )}
                  {!status && (
                    <>
                      <RedIconButton
                        size="small"
                        aria-label="Decline"
                        onClick={() => handleDecline(date)}
                      >
                        <ClearIcon />
                      </RedIconButton>
                      <GreenIconButton
                        size="small"
                        aria-label="Accept"
                        onClick={() => handleAccept(date)}
                      >
                        <CheckIcon />
                      </GreenIconButton>
                    </>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ),
          )}
        </List>
      ) : (
        <Typography color="inherit">No transactions.</Typography>
      )}
    </>
  );
}
