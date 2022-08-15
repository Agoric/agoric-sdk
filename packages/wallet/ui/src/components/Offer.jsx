/* eslint-disable import/no-extraneous-dependencies */
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { E } from '@endo/eventual-send';
import Request from './Request';
import Petname from './Petname';
import { formatDateNow } from '../util/Date';
import { withApplicationContext } from '../contexts/Application';
import ErrorBoundary from './ErrorBoundary';
import Proposal from './Proposal';

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
    requestContext: { dappOrigin, origin = 'unknown origin' } = {},
    id,
    meta: { creationStamp: date },
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

  const approve = async () => {
    setPendingOffers({ offerId: id, isPending: true });
    return E(offer.actions)
      .accept()
      .catch(e => {
        setPendingOffers({ offerId: id, isPending: false });
        console.error('Failed to accept offer', e);
      });
  };

  const decline = () => {
    setDeclinedOffers({ offerId: id, isDeclined: true });
    E(offer.actions).decline().catch(console.error);
  };

  const exit = () => {
    E(offer.actions).cancel().catch(console.error);
  };

  const close = () => {
    setPendingOffers({ offerId: id, isPending: false });
    setDeclinedOffers({ offerId: id, isDeclined: false });
    setClosedOffers({ offerId: id, isClosed: true });
  };

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
      <ErrorBoundary>
        <Proposal offer={offer} />
      </ErrorBoundary>
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
