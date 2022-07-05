import { useState } from 'react';

import { makeStyles, useTheme } from '@mui/styles';
import HelpIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/SettingsOutlined';
import IconButton from '@mui/material/IconButton';
import Public from '@mui/icons-material/Public';
import Tooltip from '@mui/material/Tooltip';

import NavDrawer from './NavDrawer';
import ConnectionSettingsDialog from './ConnectionSettingsDialog';
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
  connecting: {
    animation: `$throb 2s infinite`,
  },
  '@keyframes throb': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.2,
    },
    '100%': {
      opacity: 1,
    },
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

// Exported for testing only.
export const AppBarWithoutContext = ({
  connectionComponent,
  wantConnection,
  setWantConnection,
  connectionState,
  connectionStatus,
  connectionConfig,
}) => {
  const theme = useTheme();
  const classes = useStyles(theme);

  const [dialogOpened, setDialogOpened] = useState(connectionConfig === null);
  const handleClosed = () => {
    setDialogOpened(false);
  };

  const connectionTitle =
    connectionStatus &&
    connectionStatus[0].toUpperCase() + connectionStatus.slice(1);

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
          {connectionComponent}
          <Tooltip title={connectionTitle}>
            <IconButton
              size="medium"
              color={wantConnection ? 'primary' : 'secondary'}
              onClick={() =>
                setWantConnection(!wantConnection && connectionConfig !== null)
              }
            >
              <Public
                className={
                  connectionStatus === 'connecting' ? classes.connecting : ''
                }
                fontSize="inherit"
              >
                {connectionState}
              </Public>
            </IconButton>
          </Tooltip>
        </div>
        <div className={classes.connector}>
          <Tooltip title="Settings">
            <IconButton
              color="primary"
              size="medium"
              target="_blank"
              onClick={() => setDialogOpened(true)}
            >
              <SettingsIcon fontSize="inherit">Help</SettingsIcon>
            </IconButton>
          </Tooltip>
          <ConnectionSettingsDialog
            open={dialogOpened}
            onClose={handleClosed}
          />
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

export default withApplicationContext(AppBarWithoutContext, context => ({
  connectionComponent: context.connectionComponent,
  connectionState: context.connectionState,
  wantConnection: context.wantConnection,
  setWantConnection: context.setWantConnection,
  connectionStatus: context.connectionStatus,
  connectionConfig: context.connectionConfig,
}));
