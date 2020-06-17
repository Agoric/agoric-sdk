import React from 'react';

import {
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';

const displayNonfungible = amount => {
  const { brand, extent } = amount;

  // TODO: base this on brandBoardId instead since petnames can change
  if (brand.petname === 'zoe invite') {
    if (extent.length === 0) {
      return `${JSON.stringify(brand.petname)} purse is empty.`;
    }
    const elems = extent.map(elem => {
      return {
        instance: elem.instanceHandle.petname,
        inviteDesc: elem.inviteDesc,
      };
    });
    return (
      <div>
        <b> 
{' '}
{brand.petname} (Non-fungible)</b>
        <List>
          {elems.map(({ instance, inviteDesc }) => (
            <ListItem key={inviteDesc} value={inviteDesc} divider>
              <ListItemText
                primary={`instance: ${instance}`}
                secondary={`inviteDesc: ${inviteDesc}`}
              />
            </ListItem>
          ))}
        </List>
      </div>
    );
  }
  return (
    <div>
      <b>
{brand.petname} (Non-fungible)</b>
      <List>
        {extent.map(elem => (
          <ListItem key={JSON.stringify(elem)} divider>
            <ListItemText primary={JSON.stringify(elem)} />
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default function Amount({ amount }) {
  return (
    <>
      {Array.isArray(amount.extent) ? (
        displayNonfungible(amount)
      ) : (
        <b>
          {' '}
          {amount.extent} 
{' '}
{amount.brand.petname}
        </b>
      )}
    </>
  );
}
