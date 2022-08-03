import { stringifyPurseValue } from '@agoric/ui-components';
import { icons, defaultIcon } from '../util/Icons.js';
import Petname from './Petname';
import PurseValue from './PurseValue';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application.jsx';

import './Offer.scss';

const OfferEntry = (
  type,
  [role, { value: stringifiedValue, purseId }],
  purses,
) => {
  const value = BigInt(stringifiedValue);
  const purse = purses.find(({ id }) => id === purseId);
  console.log('using purse', purse);
  return (
    <div className="OfferEntry" key={purse.brand.petname}>
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

const entryTypes = {
  want: { header: 'Want', move: 'into' },
  give: { header: 'Give', move: 'from' },
};

const Give = (entry, purses) => OfferEntry(entryTypes.give, entry, purses);
const Want = (entry, purses) => OfferEntry(entryTypes.want, entry, purses);

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
  console.log('showing offer proposal for', offer);
  const {
    proposalForDisplay: { give = {}, want = {}, arguments: args } = {},
    invitationDetails: { fee, feePursePetname, expiry } = {},
  } = offer;

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

  const Gives = sortedEntries(give).map(g => Give(g, purses));
  const Wants = sortedEntries(want).map(w => Want(w, purses));

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
