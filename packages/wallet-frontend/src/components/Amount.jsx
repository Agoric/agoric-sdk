import React from 'react';

import {
  List,
  ListItem,
  ListItemText,
} from '@material-ui/core';

const displayNonfungible = amount => {
  const { brand, value } = amount;

  // TODO: base this on brandBoardId instead since petnames can change
  if (brand.petname === 'zoe invite') {
    if (value.length === 0) {
      return `${JSON.stringify(brand.petname)} purse is empty.`;
    }
    const elems = value.map(elem => {
      return {
        instance: elem.instanceHandle.petname,
        description: elem.description,
      };
    });
    return (
      <div>
        <b> 
{' '}
{brand.petname} (Non-fungible)</b>
        <List>
          {elems.map(({ instance, description }) => (
            <ListItem key={description} value={description} divider>
              <ListItemText
                primary={`instance: ${instance}`}
                secondary={`description: ${description}`}
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
        {value.map(elem => (
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
      {Array.isArray(amount.value) ? (
        displayNonfungible(amount)
      ) : (
        <b>
          {' '}
          {amount.value} 
{' '}
{amount.brand.petname}
        </b>
      )}
    </>
  );
}
