import { useState, useReducer } from 'react';
import { Typography } from '@mui/material';
import { E } from '@agoric/eventual-send';
import Button from '@mui/material/Button';
import Add from '@mui/icons-material/Add';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Card from '../components/Card';
import CardItem from '../components/CardItem';
import MakePurse from '../components/MakePurse';
import ImportIssuer from '../components/ImportIssuer';
import Petname from '../components/Petname';
import { icons, defaultIcon } from '../util/Icons';
import { withApplicationContext } from '../contexts/Application';

import './Issuers.scss';

const importingIssuersReducer = (state, action) => {
  return { count: state.count + action.difference };
};

// Exported for testing only.
export const IssuersWithoutContext = ({
  issuers,
  pendingPurseCreations,
  schemaActions,
  services,
}) => {
  const [selectedIssuer, setSelectedIssuer] = useState(null);
  const handleCreatePurse = id => setSelectedIssuer(id);
  const closeMakePurse = () => setSelectedIssuer(null);

  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const handleCloseSnackbar = _ => {
    setIsSnackbarOpen(false);
  };
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const showSnackbar = msg => {
    setSnackbarMessage(msg);
    setIsSnackbarOpen(true);
  };

  const [
    importingIssuers,
    dispatchImportingIssuers,
  ] = useReducer(importingIssuersReducer, { count: 0 });
  const incrementImportingIssuers = () =>
    dispatchImportingIssuers({ difference: 1 });
  const decrementImportingIssuers = () =>
    dispatchImportingIssuers({ difference: -1 });

  const [showImport, setShowImport] = useState(false);
  const closeImport = () => setShowImport(false);

  const handleImport = async (petname, boardId) => {
    incrementImportingIssuers();
    try {
      const issuerObj = await E(services.board).getValue(boardId);
      await E(schemaActions).createIssuer(issuerObj, petname);
      showSnackbar('Successfully imported issuer.');
    } catch {
      showSnackbar('Failed to import issuer.');
    } finally {
      decrementImportingIssuers();
    }
  };

  const Issuer = (issuer, index) => {
    return (
      <CardItem key={issuer.id} hideDivider={index === 0}>
        <div className="Left">
          <img
            alt="icon"
            src={icons[issuer.issuerPetname] ?? defaultIcon}
            height="32px"
            width="32px"
          />
          <div>
            <Petname name={issuer.issuerPetname} />
            <div>
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
      <Typography variant="h1">Asset Issuers</Typography>
      <div className="ImportButton">
        <Button
          onClick={() => setShowImport(true)}
          aria-label="import"
          size="medium"
          variant="contained"
        >
          <Add style={{ marginRight: '4px' }} /> Import
        </Button>
        <div className="ImportIssuerProgress">
          {importingIssuers.count > 0 && <CircularProgress size={36} />}
        </div>
      </div>
      <div className="Card-wrapper">
        <Card>{issuerItems}</Card>
      </div>
      <MakePurse issuerId={selectedIssuer} handleClose={closeMakePurse} />
      <ImportIssuer
        handleClose={closeImport}
        handleImport={handleImport}
        isOpen={showImport}
      />
      <Snackbar
        open={isSnackbarOpen}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </>
  );
};

export default withApplicationContext(IssuersWithoutContext, context => ({
  issuers: context.issuers,
  pendingPurseCreations: context.pendingPurseCreations,
  schemaActions: context.schemaActions,
  services: context.services,
}));
