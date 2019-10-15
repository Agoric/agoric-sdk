import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
import MenuIcon from '@material-ui/icons/Menu';

import MenuHeader from './MenuHeader';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

export default function TitleBar() {
  const classes = useStyles();

  const [isMenuOpen, setMenuOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  function handleMenuIconClick(event) {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  }

  function handleMenuClose() {
    setMenuOpen(false);
  }

  return (
    <div>
      <AppBar>
        <Toolbar>
          <IconButton
            edge="start"
            className={classes.menuButton}
            color="inherit"
            aria-label="menu"
            onClick={handleMenuIconClick}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            Tic Tac Toe
          </Typography>
        </Toolbar>
      </AppBar>
      <MenuHeader
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClick={handleMenuClose}
        onClose={handleMenuClose}
      />
    </div>
  );
}
