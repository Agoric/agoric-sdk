import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@material-ui/core';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/icons/Menu';
import Drawer from '@material-ui/core/Drawer';

import NavMenu from './NavMenu';

const NavDrawer = () => {
  const theme = useTheme();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleDrawer = open => event => {
    if (
      event?.type === 'keydown' &&
      (event?.key === 'Tab' || event?.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpened(open);
  };

  useEffect(() => {
    if (!isMobile) setDrawerOpened(false);
  }, [isMobile]);

  return (
    isMobile && (
      <>
        <IconButton
          aria-label="navigation drawer"
          size="medium"
          color="primary"
          onClick={toggleDrawer(true)}
        >
          <Menu fontSize="inherit"></Menu>
        </IconButton>
        <Drawer anchor="left" open={drawerOpened} onClose={toggleDrawer(false)}>
          <NavMenu />
        </Drawer>
      </>
    )
  );
};

export default NavDrawer;
