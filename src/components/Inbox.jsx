import React from 'react';

import { List, ListItem, ListItemText, Typography } from '@material-ui/core';

import { useApplicationContext } from '../contexts/Application';

export default function Inbox() {
  const { state } = useApplicationContext();
  const { inbox } = state;

  return (
    <>
      <Typography variant="h6">Transactions</Typography>
      {Array.isArray(inbox) && inbox.length > 0 ? (
        <List>
          {inbox.map(([label, extent]) => (
            <ListItem key={label} value={label}>
              <ListItemText
                primary={label.description}
                secondary={`Balance ${extent}`}
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography color="inherit">No transactions.</Typography>
      )}
    </>
  );
}
