<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { selfContact, payments, purses } from './store';

  export let payment;
  let destination;

  $: deposit = () => {
    // console.log('deposit to', destination);
    return E(payment.actions).deposit(destination);
  };
</script>

<style>

</style>

<section>
  <div>
    {#if payment.status === 'deposited'}
      Deposited <Amount amount={payment.displayPayment.depositedAmount} />
    {:else if payment.issuer}
      Payment last valued at
      {#if payment.lastAmount}
        <Amount amount={payment.displayPayment.lastAmount} />
      {/if}
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
    {:else}
      Unknown brand.  This payment cannot be verified.
    {/if}
    <Debug title="Payment Detail" target={payment} />
  </div>
</section>
