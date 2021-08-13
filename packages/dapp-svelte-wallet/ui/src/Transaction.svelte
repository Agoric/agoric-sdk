<script>
  import { E } from "@agoric/eventual-send";
  import Petname from "./Petname.svelte";
  import Amount from "./Amount.svelte";
  import Debug from "../lib/Debug.svelte";
  
  import { walletP } from './store';
  import Chip from "../lib/Chip.svelte";

  export let item;
  export let summary = true;
  export let summaryLine = 0;
  export let details = true;

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
    pending: "Pending",
    proposed: "Proposed",
  };

  const statusColors = {
    accept: "success",
    rejected: "error",
    decline: "error",
    pending: "alert",
    proposed: "grey",
  };

  $: ({
    instancePetname,
    instanceHandleBoardId,
    installationHandleBoardId,
    feePursePetname,
    offerId,
    requestContext: { date, dappOrigin, origin = "unknown origin" } = {},
    invitationDetails: { fee, expiry } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
  } = item);

  $: status = item.status || 'proposed';
</script>

<style>
  section {
    /* text-align: center; */
    max-width: 240px;
  }

  h6 {
    /* color: #ff3e00; */
    text-transform: uppercase;
    font-size: 1em;
    font-weight: bold;
    margin-top: 1em;
  }

  @media (min-width: 640px) {
    section {
      max-width: none;
    }
  }

  .actions {
    margin-top: 1em;
  }
</style>

<section>
  {#if summary}
    {#if !summaryLine || summaryLine === 1}
      {formatDateNow(date)} <Chip outline selected
      color={statusColors[status]}
    >{statusText[status]}</Chip>
    {/if}
    {#if !summaryLine || summaryLine === 2}
      <Petname name={instancePetname} board={instanceHandleBoardId} /> via ({dappOrigin || origin})
    {/if}
  {/if}
  {#if details}
  <div>
	<Debug title="Offer Detail" target={item} />
  </div>
  <div>
    {#each Object.entries(give).sort(([kwa], [kwb]) => cmp(kwa, kwb)) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Give {role}</h6>
        <Amount {amount} displayInfo={amount.displayInfo} /> from <Petname name={pursePetname} />
      </div>
    {/each}
    {#each Object.entries(want).sort(([kwa], [kwb]) => cmp(kwa, kwb)) as [role, { amount, pursePetname }], i}
      <div>
        <h6>Want {role}</h6>
        <Amount {amount} displayInfo={amount.displayInfo} /> into <Petname name={pursePetname} />
      </div>
    {/each}
    {#if fee}
      <div>
        <h6>Pay Fee</h6>
        <Amount amount={fee} displayInfo={fee.displayInfo} />
        {#if feePursePetname}
          from <Petname name={feePursePetname} />
        {/if}
      </div>
    {/if}
    {#if expiry}
      <div>
        <h6>Expiry</h6>
        {formatDateNow(parseFloat(expiry) * 1000)}
      </div>
    {/if}
  </div> 
  <div class="actions">
    {#if status === 'pending'}
    <Chip on:click={() =>
      E(walletP).cancelOffer(offerId).catch(makeRejected('Cannot cancel'))}
      selected icon="clear" color="alert"
    >Cancel</Chip>
    {/if}
    {#if status === 'proposed'}
    <div class="flex flex-row">
    <Chip on:click={() =>
      E(walletP).acceptOffer(offerId).catch(makeRejected('Cannot accept'))}
      selected icon="check" color="success"
    >Accept</Chip> <Chip on:click={() =>
      E(walletP).declineOffer(offerId).catch(makeRejected('Cannot decline'))}
      selected icon="clear" color="error"
    >Decline</Chip>
    </div>
    {/if}
  </div>
  {/if}
</section>
