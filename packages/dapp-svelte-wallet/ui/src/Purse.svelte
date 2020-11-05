<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import Transfer from "./Transfer.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";

  import { selfContact, walletP } from "./store";

  import Switch from "smelte/src/components/Switch";

export let summary = true;
export let summaryLine = 0;
export let details = true;

  export let item;

  function toggleAutoDeposit(ev) {
    if (!item.depositBoardId) {
      E(walletP).enableAutoDeposit(item.pursePetname);
    } else {
      E(walletP).disableAutoDeposit(item.pursePetname);
    }
    return false;
  }
</script>

<section>
  {#if summary}
  <div class="fullwidth">
    {#if !summaryLine || summaryLine === 1}
      <Petname name={item.pursePetname} />
    {/if}
    {#if !summaryLine || summaryLine === 2}
      <Amount amount={item.currentAmount} displayInfo={item.displayInfo} />
    {/if}
  </div>
  {/if}
  {#if details}
  <div class="py-2">
    <!--
      This wrapper div is needed to prevent the switch from toggling too soon.
      It would be nice to have something like <Switch ... on:click={toggleAutoDeposit} />
    -->
    <div on:click|capture|stopPropagation={toggleAutoDeposit}>
      <Switch value={!!item.depositBoardId} label="AutoDeposit" />
    </div>
    <Debug title="Amount Detail" target={item.currentAmount} />
  </div>
  <div class="mb-3">
    {#if item.depositBoardId && (!$selfContact || item.depositBoardId !== $selfContact.depositBoardId)}
      (
      <BoardId id={item.depositBoardId} />
      )
    {/if}
    <Transfer source={item} />
  </div>
  {/if}
</section>
