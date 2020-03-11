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
import AutoswapIcon from '@material-ui/icons/SwapHorizontalCircle';
import ClearIcon from '@material-ui/icons/Clear';
import WatchIcon from '@material-ui/icons/Watch';
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
    color: theme.pallete.getContrastText(yellow[500]),
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

  function handleCancel(id) {
    dispatch(cancelOffer(id));
  }

  function handleDecline(id) {
    dispatch(declineOffer(id));
  }

  function handleAccept(id) {
    dispatch(acceptOffer(id));
  }

//  const proposalTemplate = {
//    id: Date.now(),
//    instanceRegKey: instanceId,
//    contractIssuerIndexToRole: ['TokenA', 'TokenB', 'Liquidity'],
//    instanceInviteHook: ['makeInvite'], // E(publicAPI).makeInvite()
//    instanceAcceptedHook: undefined, // Could be E(publicAPI)...
//    seatTriggerHook: ['swap'], // E(seat).swap()
//
//    offerRulesTemplate: {
//     offer: {
//       $InputToken: {
//          pursePetname: inputPurse.pursePetname,
//          extent: inputAmount,
//        },
//      },
//      want: {
//        $OutputToken: {
//          pursePetname: outputPurse.pursePetname,
//          extent: outputAmount,
//        },
//      },
//      exit: { onDemand: {} },
//    },
//  };

  return (
    <>

      <Typography variant="h6">Transactions</Typography>
      {Array.isArray(inbox) && inbox.length > 0 ? (
        <List>
          {inbox.map(
            ({
              id,
              id: date,
              instanceRegKey,
              offerRulesTemplate,
              status,
              wait,
            }) => (
              <ListItem key={id} value={date} divider>
                <ListItemIcon>
                  <AutoswapIcon edge="start" className={classes.icon} />
                </ListItemIcon>
                <Grid container direction="column">
                  <Grid item>
                    <Typography variant="body2" display="block">
                      <i>({instanceRegKey})</i> - {formatDate(date)}
                    </Typography>
                  </Grid>
                  <Grid item>
                    {Object.entries(offerRulesTemplate.offer || {}).map(
                      ([role, { issuerPetname, pursePetname, brandRegKey, extent }], i) => (
                        <Typography key={`offer${role}`} variant="body1">
                          {i === 0 ? 'Pay' : <>and&nbsp;pay</>}&nbsp;
                          <Box component="span" fontWeight={800}>
                            {extent}
                            &nbsp;
                            {issuerPetname || '??'}
                            &nbsp;
                          </Box>
                          {brandRegKey && <i>({brandRegKey})&nbsp;</i>}
                          from&nbsp;
                          <Box component="span" fontWeight={800}>
                            {pursePetname}
                          </Box>
                        </Typography>
                      ))}
                    {Object.entries(offerRulesTemplate.want || {}).map(
                      ([role, { issuerPetname, pursePetname, brandRegKey, extent }], i) => (
                        <Typography key={`offer${role}`} variant="body1">
                          {i === 0 ? 'Receive' : <>and&nbsp;receieve</>}&nbsp;
                          <Box component="span" fontWeight={800}>
                            {extent}
                            &nbsp;
                            {issuerPetname || '??'}
                            &nbsp;
                          </Box>
                          {brandRegKey && <i>({brandRegKey})&nbsp;</i>}
                          into&nbsp;
                          <Box component="span" fontWeight={800}>
                            {pursePetname}
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
                    wait === undefined ? (
                      <GreenChip variant="outlined" label="Accepted" />
                    ) : (
                      <YellowIconButton
                        size="small"
                        aria-label="Cancel"
                        onClick={() => handleCancel(id)}
                      >
                        <WatchIcon />
                      </YellowIconButton>
                    )
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
