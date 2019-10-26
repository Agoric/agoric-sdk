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
  item: {
    '&:not(:first-child)': {
      borderTopColor: theme.palette.divider,
      borderTopStyle: 'solid',
      borderTopWidth: 1,
    },
  },
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
          {purses.map(({ name, description, extent }) => (
            <ListItem key={name} value={name} className={classes.item}>
              <ListItemIcon className={classes.icon}>
                <PurseIcon />
              </ListItemIcon>
              <ListItemText
                primary={name}
                secondary={`${extent} ${description}`}
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
