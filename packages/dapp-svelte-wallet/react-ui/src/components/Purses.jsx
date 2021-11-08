import { useState } from 'react';
import { CircularProgress } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Transfer from './Transfer';
import PurseAmount from './PurseAmount';
import { withApplicationContext } from '../contexts/Application';
import CardItem from './CardItem';
import Card from './Card';

import './Purses.scss';

// Exported for testing only.
export const PursesInternalDoNotImportOrElse = ({
  purses,
  pendingTransfers,
}) => {
  const [openPurse, setOpenPurse] = useState(null);

  const handleClickOpen = purse => {
    setOpenPurse(purse);
  };

  const handleClose = () => {
    setOpenPurse(null);
  };

  const Purse = purse => {
    return (
      <CardItem key={purse.id}>
        <div className="Left">
          <PurseAmount
            brandPetname={purse.brandPetname}
            pursePetname={purse.pursePetname}
            value={purse.currentAmount.value}
            displayInfo={purse.displayInfo}
          />
        </div>
        <div className="Right">
          {pendingTransfers.has(purse.id) ? (
            <div className="PurseProgressWrapper">
              <CircularProgress size={30} />
            </div>
          ) : (
            <Button
              variant="outlined"
              color="primary"
              size="small"
              onClick={() => handleClickOpen(purse)}
            >
              Send
            </Button>
          )}
        </div>
      </CardItem>
    );
  };
  const purseItems = (purses && purses.map(Purse)) ?? <CircularProgress />;

  return (
    <div>
      <Card header="Purses">{purseItems}</Card>
      <Transfer purse={openPurse} handleClose={handleClose} />
    </div>
  );
};

export default withApplicationContext(
  PursesInternalDoNotImportOrElse,
  context => ({
    purses: context.purses,
    pendingTransfers: context.pendingTransfers,
  }),
);
