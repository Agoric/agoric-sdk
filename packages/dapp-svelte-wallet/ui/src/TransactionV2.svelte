<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Amount from "./Amount.svelte";
  import Debug from "../lib/Debug.svelte";
  import Request from './Request.svelte';
  import { icons, defaultIcon } from './Icons.js';

  import { walletP } from './store';
  import Chip from "../lib/Chip.svelte";

  export let item;
  export let dismiss;

  let isPending = false;

  function formatDateNow(stamp) {
    if (!stamp) {
      return "unknown time";
    }
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return `${match[1]} ${match[2]}`;
  }

  function cmp(a, b) {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  }

  const makeRejected = context => 
    function rejected(e) {
      // We expect our caller to see this result, so just log an error.
      console.error(context, e);
    };

  const statusText = {
    decline: "Declined",
    rejected: "Rejected",
    accept: "Accepted",
    complete: "Accepted",
    pending: "Pending",
    proposed: "Proposed",
  };

  const statusColors = {
    accept: "success",
    rejected: "error",
    decline: "error",
    pending: "alert",
    proposed: "grey",
    complete: "success",
  };

  const accept = () => {
    isPending = true;
    E(walletP).acceptOffer(offerId).catch(makeRejected('Cannot accept'));
  }

  $: ({
    instancePetname,
    instanceHandleBoardId,
    installationHandleBoardId,
    offerId,
    requestContext: { date, dappOrigin, origin = "unknown origin" } = {},
    invitationDetails: { fee, feePursePetname, expiry } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
  } = item);

  $: status = item.status || (isPending ? 'pending' : 'proposed');
</script>

<style>
  h6 {
    /* color: #ff3e00; */
    text-transform: uppercase;
    font-size: 1em;
    font-weight: bold;
    margin-top: 1em;
  }

  .actions {
    margin-top: 1em;
  }

  .date {
    float: right;
    color: #757575;
  }

  .blue {
    color: rgb(0, 176, 255);
  }

  .token {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
  }

  .token > img {
      margin-right: 16px;
  }

  :global(.offer-status > span) {
    margin-left: 0;
  }
</style>

<Request dismiss={dismiss}
  completed={status === 'accept' || status === 'decline' || status === 'complete'}>
  <span slot="header">
    Incoming Offer
  </span>

  <span class="offer-status">
    <Chip outline selected
      color={statusColors[status]}>
      {statusText[status]}
    </Chip>
  </span>
  <span class="date">
    {formatDateNow(date)}
  </span>

  <div>
    <Petname name={instancePetname} board={instanceHandleBoardId} />
    <i>via</i> <span class="blue">{dappOrigin || origin}</span> 
  </div>

  <div>
	  <Debug title="Offer Detail" target={item} />
  </div>
  
  <div>
    {#each Object.entries(give).sort(([kwa], [kwb]) => cmp(kwa, kwb)) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Give {role}</h6>
        <div class="token">
          <img alt="icon"
            src={icons[amount.brand.petname] ?? defaultIcon}
            height="32px"
            width="32px" />
            <div>
              <Amount {amount} displayInfo={amount.displayInfo} /> from
              <Petname name={pursePetname} />
            </div>
        </div>
      </div>
    {/each}
    {#each Object.entries(want).sort(([kwa], [kwb]) => cmp(kwa, kwb)) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Want {role}</h6>
        <div class="token">
          <img alt="icon"
            src={icons[amount.brand.petname] ?? defaultIcon}
            height="32px"
            width="32px" />
            <div>
              <Amount {amount} displayInfo={amount.displayInfo} /> into
              <Petname name={pursePetname} />
            </div>
        </div>
      </div>
    {/each}
    {#if fee}
      <div>
        <h6>Pay Fee</h6>
        <div class="token">
          {#if feePursePetname}
            <img alt="icon"
              src={icons[fee.brand.petname] ?? defaultIcon}
              height="32px"
              width="32px" />
          {/if}
          <div>
            <Amount amount={fee} displayInfo={fee.displayInfo} />
            {#if feePursePetname}
              from <Petname name={feePursePetname} />
            {/if}
          </div>
        </div>
      </div>
    {/if}
    {#if expiry}
      <div>
        <h6>Expiry</h6>
        {formatDateNow(parseFloat(expiry) * 1000)}
      </div>
    {/if}
  </div> 

  <div class="actions flex flex-row flex-row-reverse">
    {#if status === 'pending'}
    <Chip on:click={() =>
      E(walletP).cancelOffer(offerId).catch(makeRejected('Cannot cancel'))}
      selected icon="clear" color="alert"
    >Cancel</Chip>
    {/if}
    {#if status === 'proposed'}
    <div>
    <Chip on:click={accept}
      selected icon="check" color="success">
      Accept
    </Chip>
    <Chip on:click={() =>
      E(walletP).declineOffer(offerId).catch(makeRejected('Cannot decline'))}
      selected icon="clear" color="error">
      Decline
    </Chip>
    </div>
    {/if}
  </div>
</Request>
