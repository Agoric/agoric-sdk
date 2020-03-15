import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import {
  List,
  ListItemIcon,
  ListItem,
  ListItemText,
  Typography,
} from '@material-ui/core';
import PurseIcon from '@material-ui/icons/BusinessCenter';

import { useApplicationContext } from '../contexts/Application';

const useStyles = makeStyles(theme => ({
  icon: {
    minWidth: 24,
    marginRight: theme.spacing(2),
  },
}));

export default function Purses() {
  const classes = useStyles();
  const { state } = useApplicationContext();
  const { purses } = state;

  return (
    <>
      <Typography variant="h6">Purses</Typography>
      {Array.isArray(purses) && purses.length > 0 ? (
        <List>
          {purses.map(({ pursePetname, brandRegKey, issuerPetname, extent }) => (
            <ListItem key={pursePetname} value={pursePetname} divider>
              <ListItemIcon className={classes.icon}>
                <PurseIcon />
              </ListItemIcon>
              <ListItemText
                primary={pursePetname}
                secondary={<><b>{extent} {issuerPetname}</b> {brandRegKey ? <i>({brandRegKey})</i> : ''}</>}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography color="inherit">No purses.</Typography>
      )}
    </>
  );
}
