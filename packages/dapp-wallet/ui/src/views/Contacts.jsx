import { Typography } from '@mui/material';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Add from '@mui/icons-material/Add';
import Card from '../components/Card';
import { withApplicationContext } from '../contexts/Application';

import './Contacts.scss';

// Exported for testing only.
export const ContactsWithoutContext = ({ contacts }) => {
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
      <div className="Import-button">
        <Button aria-label="import" size="medium" variant="contained">
          <Add style={{ marginRight: '4px' }} /> Import
        </Button>
      </div>
      <div className="ContactList">{contactCards}</div>
    </>
  );
};

export default withApplicationContext(ContactsWithoutContext, context => ({
  contacts: context.contacts,
}));
