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
import Amount from './Amount';

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
          {purses.map(({ pursePetname, currentAmount }) => (
            <ListItem key={pursePetname} value={pursePetname} divider>
              <ListItemIcon className={classes.icon}>
                <PurseIcon />
              </ListItemIcon>
              <ListItemText
                primary={pursePetname}
                secondary={<Amount amount={currentAmount} />}
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
