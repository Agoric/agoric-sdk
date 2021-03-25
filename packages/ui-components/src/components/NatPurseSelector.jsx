import { MathKind } from '@agoric/ertp';
import clsx from 'clsx';
import { stringifyValue } from '../display';

const makeNatPurseSelector = (
  React,
  MenuItem,
  TextField,
  ListItemIcon,
  ListItemText,
  PurseIcon,
  makeStyles,
) => ({
  label = 'Purse',
  purseSelected,
  onChange,
  disabled,
  error,
  purses: pursesUnfiltered,
  brandToFilter,
}) => {
  const useStyles = makeStyles(theme => ({
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
  return (
    <TextField
      select
      label={label}
      variant="outlined"
      fullWidth
      value={purseSelected === null ? '' : purseSelected.pursePetname}
      onChange={onChange}
      disabled={disabled}
      error={error}
      inputProps={{
        className: clsx(purseSelected && classes.noPadding, classes.select),
      }}
    >
      {items}
    </TextField>
  );
};

export default makeNatPurseSelector;
