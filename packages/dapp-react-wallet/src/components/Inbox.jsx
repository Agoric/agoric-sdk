import React from 'react';

import { makeStyles, withStyles } from '@material-ui/core/styles';
import { green, red, yellow } from '@material-ui/core/colors';
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
import SwapIcon from '@material-ui/icons/SwapHorizontalCircle';
import ClearIcon from '@material-ui/icons/Clear';
import CheckIcon from '@material-ui/icons/Check';

import { useApplicationContext } from '../contexts/Application';

import { cancelOffer, declineOffer, acceptOffer } from '../store/actions';

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

const YellowIconButton = withStyles(theme => ({
  root: {
    color: theme.palette.getContrastText(yellow[500]),
    backgroundColor: yellow[500],
    '&:hover': {
      backgroundColor: yellow[700],
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
    width: theme.spacing(12),
    color: red[800],
    borderColor: red[800],
  },
}))(Chip);

const GreenChip = withStyles(theme => ({
  root: {
    width: theme.spacing(12),
    color: green[800],
    borderColor: green[800],
  },
}))(Chip);

const pet = petname => petname || '???';

export default function Inbox() {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const { inbox } = state;

  function formatDateNow(stamp) {
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return <>{match[1]}&nbsp;{match[2]}</>;
  }

  function handleCancel(id) {
    dispatch(cancelOffer(id));
  }

  function handleDecline(id) {
    dispatch(declineOffer(id));
  }

  function handleAccept(id) {
    dispatch(acceptOffer(id));
  }

  //  const offer = {
  //    id: Date.now(),
  //    instancePetname,
  //    installationPetname,
  //
  //    proposalForDisplay: {
  //     give: {
  //       [keyword]: {
  //          amount: { brand: { petname: brandPetname }, value },
  //          pursePetname: inputPurse.pursePetname,
  //        },
  //      },
  //      want: {
  //        [keyword2]: {
  //          amount: { brand: { petname: brandPetname }, value },
  //          pursePetname: outputPurse.pursePetname,
  //        },
  //      },
  //      exit: { onDemand: null },
  //    },
  //  };

  return (
    <>

      <Typography variant="h6">Transactions</Typography>
      {Array.isArray(inbox) && inbox.length > 0 ? (
        <List>
          {inbox.reverse().map(
            ({
              requestContext: { date, origin = 'unknown origin'} = {},
              id,
              instancePetname,
              proposalForDisplay: { give = {}, want = {} } = {},
              status,
            }) => (
              <ListItem key={id} value={date} divider>
                <ListItemIcon>
                  <SwapIcon edge="start" className={classes.icon} />
                </ListItemIcon>
                <Grid container direction="column">
                  <Grid item>
                    <Typography variant="body2" display="block" color="secondary">
                    At&nbsp;
                    {date ? formatDateNow(date) : <i>unknown time</i>} via&nbsp;
                    {origin}
                    </Typography>
                  </Grid>
                  <Grid item>
                    <Typography variant="body2" display="block" color="secondary">
                      <Box component="span" fontWeight={800}>
                        {pet(instancePetname)}
                        &nbsp;
                      </Box>
                      says:
                    </Typography>
                  </Grid>
                  <Grid item>
                    {Object.entries(give).map(
                      ([role, { amount: { brand: { petname: brandPetname }, value }, pursePetname }], i) => (
                        <Typography key={`give${role}`} variant="body1">
                          {i === 0 ? 'Give' : <>and&nbsp;give</>}&nbsp;
                          <Box component="span" fontWeight={800}>
                            {JSON.stringify(value)}
                            &nbsp;
                            {pet(brandPetname)}
                          </Box>
                          &nbsp;from&nbsp;
                          <Box component="span" fontWeight={800}>
                            {pet(pursePetname)}
                          </Box>
                        </Typography>
                      ))}
                    {Object.entries(want).map(
                      ([role, { amount: { brand: { petname: brandPetname }, value }, pursePetname }], i) => (
                        <Typography key={`want${role}`} variant="body1">
                          {i === 0 ?
                            (Object.keys(give).length > 0 ? <>to&nbsp;receive</> : 'Receive') :
                            <>and&nbsp;receive</>
                          }&nbsp;
                          <Box component="span" fontWeight={800}>
                            {JSON.stringify(value)}
                            &nbsp;
                            {pet(brandPetname)}
                          </Box>
                          &nbsp;into&nbsp;
                          <Box component="span" fontWeight={800}>
                            {pet(pursePetname)}
                          </Box>
                        </Typography>
                      ))}
                  </Grid>
                </Grid>
                <ListItemSecondaryAction className={classes.buttons}>
                  {status === 'decline' && (
                    <RedChip variant="outlined" label="Declined" />
                  )}
                  {status === 'rejected' && (
                    <RedChip variant="outlined" label="Rejected" />
                  )}
                  {status === 'accept' && (
                    <GreenChip variant="outlined" label="Accepted" />
                  )}
                  {status === 'pending' && (
                    <YellowIconButton
                      size="small"
                      aria-label="Cancel"
                      onClick={() => handleCancel(id)}
                    >
                      <ClearIcon />
                    </YellowIconButton>
                  )}
                  {status === 'cancel' && (
                    <RedChip variant="outlined" label="Cancelled" />
                  )}
                  {!status && (
                    <>
                      <RedIconButton
                        size="small"
                        aria-label="Decline"
                        onClick={() => handleDecline(id)}
                      >
                        <ClearIcon />
                      </RedIconButton>
                      <GreenIconButton
                        size="small"
                        aria-label="Accept"
                        onClick={() => handleAccept(id)}
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
