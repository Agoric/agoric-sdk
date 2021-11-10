import { Typography } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Add from '@material-ui/icons/Add';
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
        <Button
          aria-label="import"
          size="medium"
          color="primary"
          variant="contained"
        >
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
