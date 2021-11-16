import { useState } from 'react';
import { Typography } from '@mui/material';
import Button from '@mui/material/Button';
import Add from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Card from '../components/Card';
import CardItem from '../components/CardItem';
import MakePurse from '../components/MakePurse';
import { withApplicationContext } from '../contexts/Application';

import './Issuers.scss';

// Exported for testing only.
export const IssuersWithoutContext = ({ issuers, pendingPurseCreations }) => {
  const [selectedIssuer, setSelectedIssuer] = useState(null);
  const handleCreatePurse = id => setSelectedIssuer(id);
  const closeMakePurse = () => setSelectedIssuer(null);

  const Issuer = (issuer, index) => {
    return (
      <CardItem key={issuer.id} hideDivider={index === 0}>
        <div className="Left">
          <div>
            <div className="text-gray">{issuer.issuerPetname}</div>
            <div style={{ marginTop: '4px' }}>
              Board ID: (
              <span className="Board">board:{issuer.issuerBoardId}</span>)
            </div>
          </div>
        </div>
        <div className="Right">
          {pendingPurseCreations.has(issuer.id) ? (
            <div className="IssuerProgressWrapper">
              <CircularProgress size={30} />
            </div>
          ) : (
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleCreatePurse(issuer.id)}
            >
              Make Purse
            </Button>
          )}
        </div>
      </CardItem>
    );
  };
  const issuerItems = (issuers && issuers.map(Issuer)) ?? (
    <CircularProgress style={{ margin: 'auto' }} />
  );

  return (
    <>
      <Typography variant="h1">Issuers</Typography>
      <div className="Import-button">
        <Button aria-label="import" size="medium" variant="contained">
          <Add style={{ marginRight: '4px' }} /> Import
        </Button>
      </div>
      <div className="Card-wrapper">
        <Card>{issuerItems}</Card>
      </div>
      <MakePurse issuerId={selectedIssuer} handleClose={closeMakePurse} />
    </>
  );
};

export default withApplicationContext(IssuersWithoutContext, context => ({
  issuers: context.issuers,
  pendingPurseCreations: context.pendingPurseCreations,
}));
