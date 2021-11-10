import { useMemo, forwardRef } from 'react';
import { Link, useRouteMatch } from 'react-router-dom';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import { ListItemText, ListItemIcon } from '@material-ui/core';
import DashboardIcon from '@material-ui/icons/Dashboard';
import Apps from '@material-ui/icons/Apps';
import People from '@material-ui/icons/People';
import AddCircle from '@material-ui/icons/AddCircle';

const useStyles = makeStyles(theme => ({
  nav: {
    position: 'fixed',
    top: theme.appBarHeight,
    width: theme.navMenuWidth,
    height: `calc(100vh - ${theme.appBarHeight})`,
    overflowY: 'auto',
    [theme.breakpoints.down('sm')]: {
      position: 'relative',
      top: '0',
    },
  },
  sectionHeader: {
    padding: '16px',
    fontFamily: ['Montserrat', 'Arial', 'sans-serif'].join(','),
    fontWeight: 700,
    letterSpacing: '0.15px',
    fontSize: '16px',
  },
}));

const ListItemLink = ({ icon, primary, to }) => {
  const match = useRouteMatch({
    path: to,
    exact: true,
  });

  const renderLink = useMemo(
    () =>
      forwardRef((itemProps, ref) => {
        return <Link to={to} ref={ref} {...itemProps} role={undefined} />;
      }),
    [to],
  );

  return (
    <li>
      <ListItem
        selected={match !== null}
        button
        style={{ borderRadius: '0 32px 32px 0' }}
        component={renderLink}
      >
        {icon ? <ListItemIcon>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
};

const NavMenu = () => {
  const styles = useStyles(useTheme());

  return (
    <nav className={styles.nav}>
      <div className={styles.sectionHeader}>Wallet</div>
      <List>
        <ListItemLink to="/" primary="Dashboard" icon={<DashboardIcon />} />
        <ListItemLink to="/dapps" primary="Dapps" icon={<Apps />} />
        <ListItemLink to="/contacts" primary="Contacts" icon={<People />} />
        <ListItemLink to="/issuers" primary="Issuers" icon={<AddCircle />} />
      </List>
    </nav>
  );
};

export default NavMenu;
