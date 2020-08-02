<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { selfContact, payments } from './store';

  export let payment;
</script>

<style>

</style>

<section>
  <div>
    {#if payment.status === 'deposited'}
      Deposited <Amount amount={payment.displayPayment.depositedAmount} />
    {:else if payment.issuer}
      Allegedly
      {#if payment.lastAmount}
        <Amount amount={payment.displayPayment.lastAmount} />
      {/if}
      <button on:click={() => E(payment.actions).getAmountOf()}>Refresh Amount</button>
      <button on:click={() => E(payment.actions).deposit()}>Deposit</button>
    {:else}
      Unknown brand.  This payment cannot be verified.
    {/if}
    <Debug title="Payment Detail" target={payment} />
  </div>
</section>
