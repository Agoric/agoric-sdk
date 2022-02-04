import { useState, useReducer } from 'react';
import { E } from '@agoric/eventual-send';
import { Typography } from '@mui/material';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Add from '@mui/icons-material/Add';
import Snackbar from '@mui/material/Snackbar';
import Card from '../components/Card';
import ImportContact from '../components/ImportContact';
import { withApplicationContext } from '../contexts/Application';

import './Contacts.scss';

const importingContactsReducer = (state, action) => {
  return { count: state.count + action.difference };
};

// Exported for testing only.
export const ContactsWithoutContext = ({
  contacts,
  services,
  schemaActions,
}) => {
  const [isSnackbarOpen, setIsSnackbarOpen] = useState(false);
  const handleCloseSnackbar = _ => {
    setIsSnackbarOpen(false);
  };
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const showSnackbar = msg => {
    setSnackbarMessage(msg);
    setIsSnackbarOpen(true);
  };

  const [importingContacts, dispatchImportingContacts] = useReducer(
    importingContactsReducer,
    { count: 0 },
  );
  const incrementImportingContacts = () =>
    dispatchImportingContacts({ difference: 1 });
  const decrementImportingContacts = () =>
    dispatchImportingContacts({ difference: -1 });

  const [showImport, setShowImport] = useState(false);
  const closeImport = () => setShowImport(false);

  const handleImport = async (petname, boardId) => {
    incrementImportingContacts();
    try {
      const contactObj = await E(services.board).getValue(boardId);
      await E(schemaActions).createContact(contactObj, petname);
      showSnackbar('Successfully imported contact.');
    } catch {
      showSnackbar('Failed to import contact.');
    } finally {
      decrementImportingContacts();
    }
  };

  const Contact = contact => (
    <div className="Contact" key={contact.id}>
      <Card>
        <div className="ContactContent">
          <div className="text-gray">{contact.text}</div>
          <div style={{ marginTop: '4px' }}>
            Board ID: (
            <span className="Board">board:{contact.depositBoardId}</span>)
          </div>
        </div>
      </Card>
    </div>
  );
  const contactCards = (contacts && contacts.map(Contact)) ?? (
    <CircularProgress style={{ margin: 'auto' }} />
  );

  return (
    <>
      <Typography variant="h1">Contacts</Typography>
      <div className="ImportButton">
        <Button
          onClick={() => setShowImport(true)}
          aria-label="import"
          size="medium"
          variant="contained"
        >
          <Add style={{ marginRight: '4px' }} /> Import
        </Button>
        <div className="ImportContactsProgress">
          {importingContacts.count > 0 && <CircularProgress size={36} />}
        </div>
      </div>
      <div className="ContactList">{contactCards}</div>
      <ImportContact
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

export default withApplicationContext(ContactsWithoutContext, context => ({
  contacts: context.contacts,
  services: context.services,
  schemaActions: context.schemaActions,
  walletBridge: context.walletBridge,
}));
