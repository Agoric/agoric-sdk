// @ts-check
import { E } from '@endo/eventual-send';
import { reserveThenDeposit } from './utils.js';

const trace = (...args) => console.log('GovReplaceCharter', ...args);

const { values } = Object;

const inviteToEconCharter = async (
  { consume: { namesByAddressAdmin, econCharterKit } },
  { options: { voterAddresses } },
) => {
  const { creatorFacet } = E.get(econCharterKit);

  void Promise.all(
    values(voterAddresses).map(async addr => {
      const debugName = `econ charter member ${addr}`;
      reserveThenDeposit(debugName, namesByAddressAdmin, addr, [
        E(creatorFacet).makeCharterMemberInvitation(),
      ]).catch(err => console.error(`failed deposit to ${debugName}`, err));
    }),
  );
};

const startNewEconCharter = async ({
  consume: { zoe },
  produce: { econCharterKit },
  installation: {
    consume: { binaryVoteCounter: counterP, econCommitteeCharter: installP },
  },
  instance: {
    produce: { econCommitteeCharter },
  },
}) => {
  const [charterInstall, counterInstall] = await Promise.all([
    installP,
    counterP,
  ]);
  const terms = await harden({
    binaryVoteCounterInstallation: counterInstall,
  });

  trace('Starting new EC Charter Instance');
  const startResult = E(zoe).startInstance(
    charterInstall,
    undefined,
    terms,
    undefined,
    'econCommitteeCharter',
  );
  trace('Started new EC Charter Instance Successfully');

  econCommitteeCharter.reset();
  econCommitteeCharter.resolve(E.get(startResult).instance);

  econCharterKit.reset();
  econCharterKit.resolve(startResult);
};

const addGovernorsToEconCharter = async ({
  consume: {
    reserveKit,
    vaultFactoryKit,
    econCharterKit,
    auctioneerKit,
    psmKit,
  },
  instance: {
    consume: { reserve, VaultFactory, auctioneer },
  },
}) => {
  const { creatorFacet } = E.get(econCharterKit);

  const psmKitMap = await psmKit;

  for (const { psm, psmGovernorCreatorFacet, label } of psmKitMap.values()) {
    E(creatorFacet).addInstance(psm, psmGovernorCreatorFacet, label);
  }

  await Promise.all(
    [
      {
        label: 'reserve',
        instanceP: reserve,
        facetP: E.get(reserveKit).governorCreatorFacet,
      },
      {
        label: 'VaultFactory',
        instanceP: VaultFactory,
        facetP: E.get(vaultFactoryKit).governorCreatorFacet,
      },
      {
        label: 'auctioneer',
        instanceP: auctioneer,
        facetP: E.get(auctioneerKit).governorCreatorFacet,
      },
    ].map(async ({ label, instanceP, facetP }) => {
      const [instance, govFacet] = await Promise.all([instanceP, facetP]);

      return E(creatorFacet).addInstance(instance, govFacet, label);
    }),
  );
};

export const replaceCharterCommittee = async (permittedPowers, config) => {
  const { voterAddresses } = config.options;

  await startNewEconCharter(permittedPowers);
  await addGovernorsToEconCharter(permittedPowers);

  await inviteToEconCharter(permittedPowers, {
    options: { voterAddresses },
  });

  trace('Installed New EC Charter');
};

harden(replaceCharterCommittee);

export const getManifestForReplaceElectorate = async (
  { economicCharterRef: _economicCharterRef },
  options,
) => ({
  manifest: {
    [replaceCharterCommittee.name]: {
      consume: {
        namesByAddressAdmin: true,
        econCharterKit: true,
        zoe: true,
        reserveKit: true,
        vaultFactoryKit: true,
        auctioneerKit: true,
        psmKit: true,
      },
      produce: {
        econCharterKit: true,
        econCommitteeCharter: true,
      },
      installation: {
        consume: {
          binaryVoteCounter: true,
          econCommitteeCharter: true,
        },
      },
      instance: {
        produce: {
          econCommitteeCharter: true,
        },
      },
    },
  },
  options: { ...options },
});
