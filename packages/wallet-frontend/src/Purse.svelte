<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { selfContact } from './store';

  export let purse;
  export let walletP;
  export let contacts;
  
  function toggleAutoDeposit({ target: { checked } }) {
    if (checked) {
      E(walletP).enableAutoDeposit(purse.pursePetname);
    } else {
      E(walletP).disableAutoDeposit(purse.pursePetname);
    }
  }

  // FIXME: Make UI for this.
  const value = 3;
  $: send = value => E(purse.actions).send($contacts[0].actions, value);
</script>

<style>

</style>

<section>
  <div>
    <Petname name={purse.pursePetname} />
    <Debug title="Amount Detail" target={purse.currentAmount} />
  </div>
  <Amount amount={purse.currentAmount} />
  <button on:click={() => send(value)}>Send Payment</button>
  <div>
    <label for="ad{purse.pursePetname}"><input id="ad{purse.pursePetname}" type="checkbox" on:click={toggleAutoDeposit} checked={purse.depositBoardId} /> AutoDeposit</label>
    {#if purse.depositBoardId && (!$selfContact || purse.depositBoardId !== $selfContact.depositBoardId)}
      (<BoardId id={purse.depositBoardId}/>)
    {/if}
  </div>
</section>
