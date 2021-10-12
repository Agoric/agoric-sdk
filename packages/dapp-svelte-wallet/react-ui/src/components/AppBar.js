import { useEffect, useState } from 'react';
import { useMediaQuery } from '@material-ui/core';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/icons/Menu';
import Drawer from '@material-ui/core/Drawer';
import WalletConnection from './WalletConnection';
import NavMenu from './NavMenu';

const useStyles = makeStyles(theme => ({
  header: {
    backgroundColor: theme.palette.background.default,
    borderBottom: '1px solid #eaecef',
    margin: 'auto',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: theme.appBarHeight,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'space-between',
    flexDirection: 'row',
    flexWrap: 'nowrap',
  },
  productLink: {
    alignItems: 'center',
    display: 'flex',
  },
  productLogo: {
    transform: 'scale(0.85)',
  },
  appBarSection: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    padding: '4px',
    margin: '8px',
    height: '100%',
  },
  navMenuButton: {
    display: 'none',
    [theme.breakpoints.down('sm')]: {
      display: 'block',
    },
  },
}));

const AppBar = () => {
  const theme = useTheme();
  const classes = useStyles(useTheme());
  const [drawerOpened, setDrawerOpened] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const toggleDrawer = open => event => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }

    setDrawerOpened(open);
  };

  useEffect(() => {
    if (!isMobile) setDrawerOpened(false);
  }, [isMobile]);

  const navMenuButton = isMobile ? (
    <div className={`navMenuButton ${classes.navMenuButton}`}>
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
    </div>
  ) : (
    ''
  );

  return (
    <header className={classes.header}>
      <div className={classes.appBarSection}>
        {navMenuButton}
        <a href="https://agoric.com" className={classes.productLink}>
          <img
            src="https://agoric.com/wp-content/themes/agoric_2021_theme/assets/img/logo.svg"
            className={classes.productLogo}
            alt="Agoric"
            width="200"
          />
        </a>
      </div>
      <div className={classes.appBarSection}>
        <div className={classes.connector}>
          <WalletConnection></WalletConnection>
        </div>
      </div>
    </header>
  );
};

export default AppBar;
