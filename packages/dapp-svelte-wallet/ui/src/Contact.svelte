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
    {#if item.address}
    <span>{item.address}</span>
    {/if}
    <BoardId id={item.depositBoardId} />
  {/if}
</section>
