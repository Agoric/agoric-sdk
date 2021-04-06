import { MathKind } from '@agoric/ertp';
import clsx from 'clsx';
import { stringifyValue } from '../display';

/**
 * Return `purses` filtered to just the fungible ones, and optionally just the ones for a
 * supplied brand. The `purses` argument should be provided but may be falsy because UI
 * components represent inital state as null/undefined.
 * @param {Array<Purse> | null} purses Unfiltered purses. This may be null to simplify use in UIs.
 * @param {Brand} [optBrand] - optional brand to filter for
 * @returns {Purse[]}
 */
export const filterPurses = (purses, optBrand) => {
  if (!purses) {
    // nothing to filter
    return purses;
  }
  const filter = ({ brand, displayInfo: { amountMathKind } }) =>
    amountMathKind === MathKind.NAT && (!optBrand || brand === optBrand);
  return purses.filter(filter);
};

const isNatPurse = ({ displayInfo: { amountMathKind } }) =>
  amountMathKind === MathKind.NAT;

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
  purses = [],
  className = '',
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

  let items;
  if (purses && purses.length > 0) {
    items = purses
      .filter(isNatPurse)
      .map(({ pursePetname, displayInfo, brandPetname, value }) => (
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
  } else {
    items = (
      <MenuItem key={null} value={null}>
        No purses
      </MenuItem>
    );
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
      className={`${className} ${classes.root}`}
      fullWidth
    >
      {items}
    </TextField>
  );
};

export default makeNatPurseSelector;
