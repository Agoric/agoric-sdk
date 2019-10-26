import React from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import {
  Grid,
  TextField,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import PurseIcon from '@material-ui/icons/BusinessCenter';

const useStyles = makeStyles(theme => ({
  select: {
    display: 'flex',
    alignItems: 'center',
  },
  noPadding: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  divider: {
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

export default function AssetInput({
  title,
  purses,
  onPurseChange,
  onAmountChange,
  purse,
  amount,
  disabled,
}) {
  const classes = useStyles();

  return (
    <Grid container spacing={3}>
      <Grid
        item
        xs={12}
        sm={8}
        container
        direction="column"
        alignItems="flex-end"
        justify="flex-end"
      >
        <TextField
          label={title}
          type="number"
          variant="outlined"
          fullWidth
          InputProps={{
            inputProps: {
              min: 0,
            },
          }}
          onChange={onAmountChange}
          onKeyPress={e => {
            const charCode = e.which ? e.which : e.keyCode;

            // Prevent 'minus' character
            if (charCode === 45) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          value={amount}
          error={purse && amount > purse.extent}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          select
          label="Currency"
          variant="outlined"
          fullWidth
          value={purse}
          onChange={onPurseChange}
          inputProps={{
            className: clsx(purse && classes.noPadding, classes.select),
          }}
          disabled={disabled}
        >
          {Array.isArray(purses) &&
            purses.map(([name, { description, extent }]) => (
              <MenuItem key={name} value={name} className={classes.divider}>
                <ListItemIcon className={classes.icon}>
                  <PurseIcon />
                </ListItemIcon>
                <ListItemText
                  primary={name}
                  secondary={`${extent} ${description}`}
                />
              </MenuItem>
            ))}
        </TextField>
      </Grid>
    </Grid>
  );
}
