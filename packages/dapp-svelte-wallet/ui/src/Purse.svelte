<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import Transfer from "./Transfer.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { selfContact } from "./store";

  import Switch from "smelte/src/components/Switch";

  export let purse;
  export let walletP;

  function toggleAutoDeposit(ev) {
    if (!purse.depositBoardId) {
      E(walletP).enableAutoDeposit(purse.pursePetname);
    } else {
      E(walletP).disableAutoDeposit(purse.pursePetname);
    }
  }
</script>

<style>
  section {
    padding: 10px;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }
</style>

<section>
  <div>
    <Petname name={purse.pursePetname} />
    <Debug title="Amount Detail" target={purse.currentAmount} />
  </div>
  <Amount amount={purse.currentAmount} />
  <Transfer source={purse} />
  <div>
    <!--
      This wrapper div is needed to prevent the switch from toggling too soon.
      It would be nice to have something like <Switch ... on:click={toggleAutoDeposit} />
    -->
    <div on:click|capture|stopPropagation={toggleAutoDeposit}>
      <Switch value={!!purse.depositBoardId} label="AutoDeposit" />
    </div>
    {#if purse.depositBoardId && (!$selfContact || purse.depositBoardId !== $selfContact.depositBoardId)}
      (
      <BoardId id={purse.depositBoardId} />
      )
    {/if}
  </div>
</section>
