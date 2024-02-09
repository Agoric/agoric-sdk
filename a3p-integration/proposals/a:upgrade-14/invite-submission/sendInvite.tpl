// to be replaced before execution
const addr = 'XX_ADDRESS_XX';

// verify that a pre-existing wallet has an invitation purse that is still monitored
const sendInvitation = async powers => {
  console.log('sendInvitation start');
  // namesByAddress is broken #8113
  const {
    consume: { namesByAddressAdmin, zoe },
    instance: {
      consume: { reserve },
    },
  } = powers;
  const pf = E(zoe).getPublicFacet(reserve);
  const anInvitation = await E(pf).makeAddCollateralInvitation();

  await E(namesByAddressAdmin).reserve(addr);
  // don't trigger the namesByAddressAdmin.readonly() bug
  const addressAdmin = E(namesByAddressAdmin).lookupAdmin(addr);

  await E(addressAdmin).reserve('depositFacet');
  const addressHub = E(addressAdmin).readonly();
  const addressDepositFacet = E(addressHub).lookup('depositFacet');

  await E(addressDepositFacet).receive(anInvitation);
  console.log('ADDED an invitation to a purse!');
};

sendInvitation;
