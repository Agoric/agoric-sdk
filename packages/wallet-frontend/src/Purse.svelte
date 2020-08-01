<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
import { E } from "@agoric/captp";

  export let purse;
  export let walletP;
</script>

<style>

</style>

<section>
  <div>
    <Petname name={purse.pursePetname} />
    <Debug title="Amount Detail" target={purse.currentAmount} />
  </div>
  <Amount amount={purse.currentAmount} />
  <div>
    AutoDeposit:
    {#if purse.depositBoardId}
      {purse.depositBoardId}
      <button on:click={() => E(walletP).disableAutoDeposit(purse.pursePetname)}>Disable</button>
    {:else}
      <button on:click={() => E(walletP).enableAutoDeposit(purse.pursePetname)}>Enable</button>
    {/if}
  </div>
</section>
