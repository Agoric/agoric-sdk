import React, { useContext } from 'react';

import { Menu, MenuItem } from '@material-ui/core';

import { ApplicationContext } from '../contexts/Application';
import { newGame } from '../store/actions';

export default function MenuHeader({ anchorEl, open, onClick, onClose }) {
  const { dispatch } = useContext(ApplicationContext);

  function handleNewGame() {
    onClick();
    dispatch(newGame());
  }

  return (
    <Menu open={open} onClose={onClose} anchorEl={anchorEl}>
      <MenuItem button onClick={handleNewGame}>
        New game
      </MenuItem>
    </Menu>
  );
}
