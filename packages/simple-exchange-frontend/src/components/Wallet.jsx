import React from 'react';

import {
  Card,
  CardHeader,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';

import { useApplicationContext } from '../contexts/Application';

export default function Wallet() {
  const { state } = useApplicationContext();
  const { purses } = state;

  return (
    <Card elevation={0}>
      <CardHeader title="Wallet Balance" />
      <Divider />

      <List>
        {Array.isArray(purses) && purses.length > 0 ? (
          purses.map(({ purseName, assayId, extent }) => (
            <ListItem key={purseName} value={purseName} divider>
              <ListItemText
                primary={purseName}
                secondary={`${extent} ${assayId}`}
              />
            </ListItem>
          ))
        ) : (
          <ListItem key={null} value={null}>
            No purses.
          </ListItem>
        )}
      </List>
    </Card>
  );
}
