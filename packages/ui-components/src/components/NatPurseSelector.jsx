import { MathKind } from '@agoric/ertp';
import clsx from 'clsx';
import { stringifyValue } from '../display';

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.

const makeNatPurseSelector = ({
  React,
  MenuItem,
  TextField,
  ListItemIcon,
  ListItemText,
  PurseIcon,
  makeStyles,
}) => ({
  label = 'Purse',
  purseSelected = null,
  onChange = () => {},
  disabled = false,
  error = false,
  purses: pursesUnfiltered,
  brandToFilter = null,
}) => {
  const useStyles = makeStyles(theme => ({
    root: {
      minWidth: '150px',
    },
    select: {
      display: 'flex',
      alignItems: 'center',
    },
    noPadding: {
      paddingTop: 0,
      paddingBottom: 0,
    },
    icon: {
      minWidth: 24,
      marginRight: theme.spacing(2),
    },
  }));

  const classes = useStyles();

  const noPurses = (
    <MenuItem key={null} value={null}>
      No purses
    </MenuItem>
  );

  let items = noPurses;
  if (pursesUnfiltered === null) {
    pursesUnfiltered = [];
  }

  const isNatPurse = ({ displayInfo: { amountMathKind } }) =>
    amountMathKind === MathKind.NAT;

  const isSameBrand = ({ brand }) => brand === brandToFilter;

  let purses = pursesUnfiltered.filter(isNatPurse);
  if (brandToFilter) {
    purses = purses.filter(isSameBrand);
  }

  if (purseSelected === null && purses.length) {
    purseSelected = purses[0];
  }

  if (purses && purses.length > 0) {
    items = purses.map(({ pursePetname, displayInfo, brandPetname, value }) => (
      <MenuItem key={pursePetname} value={pursePetname} divider>
        <ListItemIcon className={classes.icon}>
          <PurseIcon />
        </ListItemIcon>
        <ListItemText
          primary={pursePetname}
          secondary={`${stringifyValue(
            value,
            MathKind.NAT,
            displayInfo && displayInfo.decimalPlaces,
          )} ${brandPetname}`}
        />
      </MenuItem>
    ));
  }

  const getPurse = event => {
    const pursePetname = event.target.value;
    const purse = purses.find(
      p => JSON.stringify(p.pursePetname) === JSON.stringify(pursePetname),
    );
    onChange(purse);
  };

  return (
    <TextField
      select
      label={label}
      variant="outlined"
      value={purseSelected === null ? '' : purseSelected.pursePetname}
      onChange={getPurse}
      disabled={disabled}
      error={error}
      inputProps={{
        className: clsx(purseSelected && classes.noPadding, classes.select),
      }}
      className={classes.root}
    >
      {items}
    </TextField>
  );
};

export default makeNatPurseSelector;
