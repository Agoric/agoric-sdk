/* eslint-disable import/no-extraneous-dependencies */
import { Nat } from '@agoric/nat';
import { stringifyPurseValue } from '@agoric/ui-components';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { E } from '@agoric/eventual-send';
import Request from './Request';
import Petname from './Petname';
import { icons, defaultIcon } from '../util/Icons.js';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application';

import './Offer.scss';

const statusText = {
  decline: 'Declined',
  rejected: 'Rejected',
  accept: 'Accepted',
  complete: 'Accepted',
  pending: 'Pending',
  proposed: 'Proposed',
  cancel: 'Cancelled',
};

const statusColors = {
  accept: 'success',
  rejected: 'error',
  decline: 'error',
  pending: 'warning',
  proposed: 'default',
  complete: 'success',
  cancel: 'default',
};

const cmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const entryTypes = {
  want: { header: 'Want', move: 'into' },
  give: { header: 'Give', move: 'from' },
};

const OfferWithoutContext = ({
  offer,
  pendingOffers,
  setPendingOffers,
  declinedOffers,
  setDeclinedOffers,
  setClosedOffers,
}) => {
  const {
    instancePetname,
    instanceHandleBoardId,
    requestContext: { date, dappOrigin, origin = 'unknown origin' } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    invitationDetails: { fee, feePursePetname, expiry } = {},
    id,
  } = offer;
  let status = offer.status || 'proposed';

  // Update context if component was rendered while pending.
  if (status === 'pending' && !pendingOffers.has(id)) {
    setPendingOffers({ offerId: id, isPending: true });
  }

  // Eagerly show pending and declined offers' states.
  if (status === 'proposed' && pendingOffers.has(id)) {
    status = 'pending';
  }
  if (status === 'proposed' && declinedOffers.has(id)) {
    status = 'decline';
  }

  const approve = () => {
    setPendingOffers({ offerId: id, isPending: true });
    E(offer.actions).accept();
  };

  const decline = () => {
    setDeclinedOffers({ offerId: id, isDeclined: true });
    E(offer.actions).decline();
  };

  const exit = () => {
    E(offer.actions).cancel();
  };

  const close = () => {
    setPendingOffers({ offerId: id, isPending: false });
    setDeclinedOffers({ offerId: id, isDeclined: false });
    setClosedOffers({ offerId: id, isClosed: true });
  };

  const gives = Object.entries(give).sort(([kwa], [kwb]) => cmp(kwa, kwb));
  const wants = Object.entries(want).sort(([kwa], [kwb]) => cmp(kwa, kwb));

  const OfferEntry = (type, [role, { amount, pursePetname }]) => {
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
            <div className="Value">
              {stringifyPurseValue({
                value,
                displayInfo: amount.displayInfo,
              })}{' '}
              <Petname name={amount.brand.petname} />
            </div>
            {type.move} <Petname name={pursePetname} />
          </div>
        </div>
      </div>
    );
  };

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

  const Give = entry => OfferEntry(entryTypes.give, entry);
  const Want = entry => OfferEntry(entryTypes.want, entry);

  const controls = (
    <div className="Controls">
      {status === 'pending' && (
        <Chip
          onClick={exit}
          variant="outlined"
          color="error"
          label="Exit"
          icon={<CloseIcon />}
        />
      )}
      {status === 'proposed' && (
        <>
          <Chip
            onClick={approve}
            variant="outlined"
            label="Approve"
            icon={<CheckIcon />}
            color="success"
            style={{ marginLeft: '8px' }}
          />
          <Chip
            variant="outlined"
            onClick={decline}
            label="Decline"
            color="error"
            icon={<CloseIcon />}
          />
        </>
      )}
    </div>
  );

  const isOfferCompleted = [
    'accept',
    'decline',
    'complete',
    'rejected',
    'cancel',
  ].includes(status);

  return (
    <Request header="Offer" completed={isOfferCompleted} close={close}>
      <Chip
        variant="outlined"
        color={statusColors[status]}
        label={statusText[status]}
      />
      <span className="Date text-gray">{formatDateNow(date)}</span>
      <div className="OfferOrigin">
        <Petname name={instancePetname} board={instanceHandleBoardId} />
        <i> via </i>
        <span className="Blue">{dappOrigin || origin}</span>
      </div>
      <div>
        {gives.map(Give)}
        {wants.map(Want)}
        {feeEntry}
        {expiry && (
          <div className="OfferEntry">
            <h6>Expiry</h6>
            <div className="Expiry text-gray">
              {formatDateNow(parseFloat(expiry) * 1000)}
            </div>
          </div>
        )}
      </div>
      {controls}
    </Request>
  );
};

export default withApplicationContext(OfferWithoutContext, context => ({
  pendingOffers: context.pendingOffers,
  setPendingOffers: context.setPendingOffers,
  declinedOffers: context.declinedOffers,
  setDeclinedOffers: context.setDeclinedOffers,
  setClosedOffers: context.setClosedOffers,
}));
