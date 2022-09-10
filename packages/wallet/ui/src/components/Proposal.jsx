import { Nat } from '@agoric/nat';
import { stringifyPurseValue } from '@agoric/ui-components';
import { icons, defaultIcon } from '../util/Icons.js';
import Petname from './Petname';
import PurseValue from './PurseValue';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application.jsx';

import './Offer.scss';

const OfferEntryFromTemplate = (
  type,
  [role, { value: stringifiedValue, pursePetname }],
  purses,
) => {
  const value = BigInt(stringifiedValue);
  const purse = purses.find(p => p.pursePetname === pursePetname);
  if (!purse) {
    return null;
  }
  return (
    <div className="OfferEntry" key={purse.brandPetname}>
      <h6>
        {type.header} {role}
      </h6>
      <div className="Token">
        <img
          alt="icon"
          src={icons[purse.brand.petname] ?? defaultIcon}
          height="32px"
          width="32px"
        />
        <div>
          <PurseValue
            value={value}
            displayInfo={purse.displayInfo}
            brandPetname={purse.brandPetname}
          />
          {type.move} <Petname name={purse.pursePetname} />
        </div>
      </div>
    </div>
  );
};

const OfferEntryFromDisplayInfo = (type, [role, { amount, pursePetname }]) => {
  const value =
    amount.displayInfo.assetKind === 'nat' ? Nat(amount.value) : amount.value;
  return (
    <div className="OfferEntry" key={amount.brand.petname}>
      <h6>
        {type.header} {role}
      </h6>
      <div className="Token">
        <img
          alt="icon"
          src={icons[amount.brand.petname] ?? defaultIcon}
          height="32px"
          width="32px"
        />
        <div>
          <PurseValue
            value={value}
            displayInfo={amount.displayInfo}
            brandPetname={amount.brand.petname}
          />
          {type.move} <Petname name={pursePetname} />
        </div>
      </div>
    </div>
  );
};

const entryTypes = {
  want: { header: 'Want', move: 'into' },
  give: { header: 'Give', move: 'from' },
};

const GiveFromDisplayInfo = entry =>
  OfferEntryFromDisplayInfo(entryTypes.give, entry);
const WantFromDisplayInfo = entry =>
  OfferEntryFromDisplayInfo(entryTypes.want, entry);

const GiveFromTemplate = (entry, purses) =>
  OfferEntryFromTemplate(entryTypes.give, entry, purses);
const WantFromTemplate = (entry, purses) =>
  OfferEntryFromTemplate(entryTypes.want, entry, purses);

const cmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const sortedEntries = entries =>
  Object.entries(entries).sort(([kwa], [kwb]) => cmp(kwa, kwb));

const Proposal = ({ offer, purses }) => {
  console.log('offer', offer);
  const {
    proposalForDisplay,
    proposalTemplate,
    invitationDetails: { fee, feePursePetname, expiry } = {},
  } = offer;

  let give = {};
  let want = {};
  let args;
  let hasDisplayInfo = false;

  // Proposed offers only have a `proposalTemplate`. Offers from the wallet
  // contract have a `proposalForDisplay`.
  if (proposalForDisplay) {
    give = proposalForDisplay.give ?? {};
    want = proposalForDisplay.want ?? {};
    args = proposalForDisplay.arguments;
    hasDisplayInfo = true;
  } else if (proposalTemplate) {
    give = proposalTemplate.give ?? {};
    want = proposalTemplate.want ?? {};
    args = proposalTemplate.arguments;
  } else {
    // The offer does not have a proposal.
  }

  if (!purses) return <></>;

  const feeEntry = fee && (
    <div className="OfferEntry">
      <h6>Pay Fee</h6>
      <div className="Token">
        {feePursePetname && (
          <img
            alt="icon"
            src={icons[fee.brand.petname] ?? defaultIcon}
            height="32px"
            width="32px"
          />
        )}
        <div>
          <div className="Value">
            {stringifyPurseValue({
              value: fee.value,
              displayInfo: fee.displayInfo,
            })}{' '}
            <Petname name={fee.brand.petname} />
          </div>
          from <Petname name={feePursePetname} />
        </div>
      </div>
    </div>
  );

  const Gives = sortedEntries(give).map(g =>
    hasDisplayInfo ? GiveFromDisplayInfo(g) : GiveFromTemplate(g, purses),
  );
  const Wants = sortedEntries(want).map(w =>
    hasDisplayInfo ? WantFromDisplayInfo(w) : WantFromTemplate(w, purses),
  );

  return (
    <>
      {Gives}
      {Wants}
      {feeEntry}
      {expiry && (
        <div className="OfferEntry">
          <h6>Expiry</h6>
          <div className="Expiry text-gray">
            {formatDateNow(parseFloat(expiry) * 1000)}
          </div>
        </div>
      )}
      {args !== undefined && (
        <div className="OfferEntry">
          <h6>Arguments</h6>
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
      )}
    </>
  );
};

export default withApplicationContext(Proposal, ({ purses }) => ({
  purses,
}));
