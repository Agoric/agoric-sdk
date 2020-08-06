<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { purses } from './store';

  export let item;
  export let summary = true;
  export let details = true;

  let destination;

  $: deposit = () => {
    // console.log('deposit to', destination);
    return E(item.actions).deposit(destination);
  };
</script>

<section>
  <div>
    {#if item.status === 'deposited'}
      {#if summary}
        Deposited <Amount amount={item.displayPayment.depositedAmount} />
      {/if}
    {:else if item.issuer}
      {#if summary}
        Payment amount
        {#if item.lastAmount}
          <Amount amount={item.displayPayment.lastAmount} />
        {/if}
      {/if}
    
      {#if details}
      <button on:click={() => E(item.actions).getAmountOf()}>Refresh Amount</button>
      <button on:click={deposit}>Deposit to</button>
      {#if $purses}
        <select bind:value={destination}>
          <option value={undefined}>Automatic</option>
          {#each $purses as p}
            {#if p.brand === item.brand}
              <option>{p.pursePetname}</option>
            {/if}
          {/each}
        </select>
      {/if}
      {/if}
    {:else}
      {#if summary}
      Unknown brand.  This payment cannot be verified.
      {/if}
    {/if}
    {#if details}
      <Debug title="Payment Detail" target={item} />
    {/if}
  </div>
</section>
