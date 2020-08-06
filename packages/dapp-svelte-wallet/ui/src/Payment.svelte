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

  const payment = item;
  let destination;

  $: deposit = () => {
    // console.log('deposit to', destination);
    return E(payment.actions).deposit(destination);
  };
</script>

<section>
  <div>
    {#if payment.status === 'deposited'}
      {#if summary}
        Deposited <Amount amount={payment.displayPayment.depositedAmount} />
      {/if}
    {:else if payment.issuer}
      {#if summary}
        Payment amount
        {#if payment.lastAmount}
          <Amount amount={payment.displayPayment.lastAmount} />
        {/if}
      {/if}
    
      {#if details}
      <button on:click={() => E(payment.actions).getAmountOf()}>Refresh Amount</button>
      <button on:click={deposit}>Deposit to</button>
      {#if $purses}
        <select bind:value={destination}>
          <option value={undefined}>Automatic</option>
          {#each $purses as p}
            {#if p.brand === payment.brand}
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
      <Debug title="Payment Detail" target={payment} />
    {/if}
  </div>
</section>
