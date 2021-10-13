import { makeStyles, useTheme } from '@material-ui/core/styles';

import WalletConnection from './WalletConnection';

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
    marginLeft: '16px',
    alignItems: 'center',
    display: 'flex',
  },
  productLogo: {
    transform: 'scale(0.85)',
  },
  appBarSection: {
    display: 'flex',
    flexDirection: 'row',
    padding: '4px',
    height: '100%',
  },
}));

const AppBar = () => {
  const classes = useStyles(useTheme());
  return (
    <header className={classes.header}>
      <div className={classes.appBarSection}>
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
