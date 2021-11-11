/* eslint-disable import/no-extraneous-dependencies */
import { stringifyPurseValue } from '@agoric/ui-components';
import Chip from '@material-ui/core/Chip';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import Request from './Request';
import Petname from './Petname';
import { icons, defaultIcon } from '../util/Icons.js';
import { formatDateNow } from '../util/Date';

import './Offer.scss';

const statusText = {
  decline: 'Declined',
  rejected: 'Rejected',
  accept: 'Accepted',
  complete: 'Accepted',
  pending: 'Pending',
  proposed: 'Proposed',
};

const statusColors = {
  accept: 'success',
  rejected: 'error',
  decline: 'error',
  pending: 'alert',
  proposed: 'default',
  complete: 'success',
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

const Offer = ({ offer }) => {
  const {
    status = 'proposed',
    instancePetname,
    instanceHandleBoardId,
    requestContext: { date, dappOrigin, origin = 'unknown origin' } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    invitationDetails: { fee, feePursePetname, expiry } = {},
  } = offer;

  const accept = () => {};
  const decline = () => {};
  const cancel = () => {};

  const gives = Object.entries(give).sort(([kwa], [kwb]) => cmp(kwa, kwb));
  const wants = Object.entries(want).sort(([kwa], [kwb]) => cmp(kwa, kwb));

  const OfferEntry = (type, [role, { amount, pursePetname }]) => (
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
              value: amount.value,
              displayInfo: amount.displayInfo,
            })}{' '}
            <Petname name={amount.brand.petname} />
          </div>
          {type.move} <Petname name={pursePetname} />
        </div>
      </div>
    </div>
  );

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
          onClick={cancel}
          variant="outlined"
          label="Cancel"
          icon={<CloseIcon />}
        />
      )}
      {status === 'proposed' && (
        <>
          <Chip
            onClick={accept}
            variant="outlined"
            label="Accept"
            icon={<CheckIcon />}
            color="primary"
            style={{ marginLeft: '8px' }}
          />
          <Chip
            variant="outlined"
            onClick={decline}
            label="Decline"
            icon={<CloseIcon />}
          />
        </>
      )}
    </div>
  );

  return (
    <Request
      header="Offer"
      completed={
        status === 'accept' || status === 'decline' || status === 'complete'
      }
    >
      <Chip color={statusColors[status]} label={statusText[status]} />
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

export default Offer;
