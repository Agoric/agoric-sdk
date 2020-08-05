<script>
  import Petname from "./Petname.svelte";
  import BoardId from "./BoardId.svelte";
  import MakePurse from "./MakePurse.svelte";
  import { walletP } from "./store";

  import { E } from "@agoric/captp";

  export let item;

  export let summary = false;
  export let details = false;
  if (!summary && !details) {
    summary = true;
  }
</script>

<div>
  {#if summary}
    <Petname name={item[0]} />
  {/if}
  {#if details}
    <div>
      Board ID:
      <BoardId
        onPublish={() => E(walletP).publishIssuer(item[1].brand)}
        id={item[1].issuerBoardId} />
    </div>

    <MakePurse issuerPetname={item[0]}>Make Purse</MakePurse>
  {/if}
</div>
