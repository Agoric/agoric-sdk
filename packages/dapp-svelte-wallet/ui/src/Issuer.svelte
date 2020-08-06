<script>
  import Petname from "./Petname.svelte";
  import BoardId from "./BoardId.svelte";
  import MakePurse from "./MakePurse.svelte";
  import { walletP } from "./store";

  import { E } from "@agoric/captp";

  export let item;

  export let summary = true;
  export let details = true;
</script>

<section>
  {#if summary}
    <Petname name={item.issuerPetname} />
  {/if}
  {#if details}
    <div>
      Board ID:
      <BoardId
        onPublish={() => E(walletP).publishIssuer(item.brand)}
        id={item.issuerBoardId} />
    </div>

    <MakePurse issuerPetname={item.issuerPetname}>Make Purse</MakePurse>
  {/if}
</section>
