import { makeStyles, useTheme } from '@mui/styles';
import HelpIcon from '@mui/icons-material/HelpOutline';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';

import WalletConnection from './WalletConnection';
import NavDrawer from './NavDrawer';
import ChainConnector from './ChainConnector';
import { withApplicationContext } from '../contexts/Application';

const logoUrl =
  'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/img/logo.svg';
const helpUrl = 'https://agoric.com/documentation/guides/wallet/ui.html';

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
}));

const AppBar = ({ useChainBackend }) => {
  const theme = useTheme();
  const classes = useStyles(theme);

  return (
    <header className={classes.header}>
      <div className={classes.appBarSection}>
        <NavDrawer />
        <a href="https://agoric.com" className={classes.productLink}>
          <img
            src={logoUrl}
            className={classes.productLogo}
            alt="Agoric"
            width="200"
          />
        </a>
      </div>
      <div className={classes.appBarSection}>
        <div className={classes.connector}>
          {useChainBackend ? (
            <ChainConnector></ChainConnector>
          ) : (
            <WalletConnection></WalletConnection>
          )}
        </div>
        <div className={classes.connector}>
          <Tooltip title="Help">
            <IconButton
              color="primary"
              size="medium"
              target="_blank"
              href={helpUrl}
            >
              <HelpIcon fontSize="inherit">Help</HelpIcon>
            </IconButton>
          </Tooltip>
        </div>
      </div>
    </header>
  );
};

export default withApplicationContext(AppBar, context => ({
  useChainBackend: context.useChainBackend,
}));
