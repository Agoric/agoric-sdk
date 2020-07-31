<script>
  import { E } from '@agoric/eventual-send';
  import Petname from './Petname.svelte';

  export let txn;
  export let id;
  export let walletP;

  function formatDateNow(stamp) {
    const date = new Date(stamp);
    const isoStamp = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
    const isoDate = new Date(isoStamp);
    const isoStr = isoDate.toISOString();
    const match = isoStr.match(/^(.*)T(.*)\..*/);
    return `${match[1]} ${match[2]}`;
  }

  const statusText = {
    decline: "Declined",
    rejected: "Rejected",
    accept: "Accepted",
    pending: "Pending"
  };

  $: ({
    instancePetname,
    requestContext: { date, origin = "unknown origin" } = {},
    proposalForDisplay: { give = {}, want = {} } = {},
    status,
  } = txn);
</script>

<style>
  main {
    /* text-align: center; */
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }

  button:hover {
    background-color: red;
  }
</style>

<div>
  At&nbsp;
  {#if date}
    {formatDateNow(date)}
  {:else}
    <i>unknown time</i>
  {/if}
  via&nbsp;{origin}
</div>
<div><Petname name={instancePetname}/>&nbsp;</div>
<div>
  {#each Object.entries(give) as [role, { amount: { brand, value, pursePetname } }], i}
    <div>
      {#if i === 0}Give{:else}and&nbsp;give{/if}
      &nbsp;
      <div>{JSON.stringify(value)}&nbsp; <Petname name={brand.petname} /></div>
      &nbsp;from&nbsp;
      <Petname name={pursePetname} />
    </div>
  {/each}
  {#each Object.entries(give) as [role, { amount: { brand, value, pursePetname } }], i}
    <div>
      {#if i === 0}
        {#if Object.keys(give).length > 0}to&nbsp;receive{:else}Receive{/if}
      {:else}and&nbsp;receive{/if}
      &nbsp;
      <div>{JSON.stringify(value)}&nbsp; <Petname name={brand.petname} /></div>
      &nbsp;into&nbsp;
      <Petname name={pursePetname} />
    </div>
  {/each}
</div>
<div>
  <b>{statusText[status || 'pending']}</b>
  <button on:click={() => E(walletP).acceptOffer(id)}>Accept</button>
  <button on:click={() => E(walletP).declineOffer(id)}>Decline</button>
  <button on:click={() => E(walletP).cancelOffer(id)}>Cancel</button>
</div>
