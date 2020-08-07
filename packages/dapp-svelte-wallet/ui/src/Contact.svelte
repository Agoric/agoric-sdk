<script>
  import BoardId from "./BoardId.svelte";
  import Petname from './Petname.svelte';

  export let item;

  export let summary = true;
  export let details = true;

</script>

<section>
  {#if summary}
  <Petname name={item.contactPetname} />
  {/if}
  {#if details}
  <BoardId id={item.depositBoardId} />
  {/if}
</section>
