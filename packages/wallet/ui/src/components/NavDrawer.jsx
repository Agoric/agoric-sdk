import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/icons-material/Menu';
import Drawer from '@mui/material/Drawer';

import NavMenu from './NavMenu';

const NavDrawer = () => {
  const theme = useTheme();
  const [drawerOpened, setDrawerOpened] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
          <NavMenu setDrawerOpened={setDrawerOpened} />
        </Drawer>
      </>
    )
  );
};

export default NavDrawer;
