import { CircularProgress } from '@material-ui/core';
import Card from './Card';
import CardItem from './CardItem';
import { withApplicationContext } from '../contexts/Application';
import PurseAmount from './PurseAmount';

import './Purses.scss';

// Exported for testing only.
export const PursesInternalDoNotImportOrElse = ({ purses }) => {
  const Purse = purse => {
    return (
      <CardItem key={purse.id}>
        <PurseAmount
          brandPetname={purse.brandPetname}
          pursePetname={purse.pursePetname}
          value={purse.currentAmount.value}
          displayInfo={purse.displayInfo}
        />
      </CardItem>
    );
  };
  const purseItems = (purses && purses.map(Purse)) ?? <CircularProgress />;

  return (
    <div>
      <Card header="Purses">{purseItems}</Card>
    </div>
  );
};

export default withApplicationContext(
  PursesInternalDoNotImportOrElse,
  context => ({
    purses: context.purses,
  }),
);
