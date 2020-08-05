<script>
  import BoardId from "./BoardId.svelte";
  import Petname from "./Petname.svelte";
  import MakePurse from "./MakePurse.svelte";
  import { walletP } from "./store";

  import { E } from "@agoric/captp";
  import Card from "smelte/src/components/Card";
  import Dialog from "smelte/src/components/Dialog";
  import CancelButton from "../lib/CancelButton.svelte";
  import Contact from "./Contact.svelte";

  export let issuer;

  let selected = false;
  const onClick = ev => {
    ev.stopPropagation();
    selected = !selected;
  };
</script>

{#if selected}
  <Card.Card class="fullwidth px-1 py-1">
    <div on:click={onClick}>
      <Card.Title title="Issuer Details" />
    </div>

    <Petname name={issuer[0]} />

    <!-- <Dialog bind:value={selected}>
    <h5 slot="title">{issuer[0]} Issuer Details</h5> -->

    <div class="px-2">
      Board ID:
      <BoardId
        onPublish={() => E(walletP).publishIssuer(issuer[1].brand)}
        id={issuer[1].issuerBoardId} />
    </div>

    <!-- </Dialog> -->
    <div slot="actions">
      {#if selected}
        <MakePurse issuerPetname={issuer[0]}>Make Purse</MakePurse>
        <CancelButton
          on:click={ev => {
            ev.stopPropagation();
            selected = false;
          }} />
      {/if}
    </div>
  </Card.Card>
{:else}
  <div on:click={onClick}>
    <Card.Card class="fullwidth px-1 py-1">
      <Petname name={issuer[0]} />
    </Card.Card>
  </div>
{/if}
