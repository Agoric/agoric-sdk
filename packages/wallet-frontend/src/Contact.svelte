<script>
  import Tooltip from "../lib/Tooltip.svelte";
  import BoardId from "./BoardId.svelte";
  import Petname from './Petname.svelte';

  export let contact;
</script>

<style>

</style>

<section>
  <Tooltip>
    <div slot="target">
      <Petname name={contact[0]} />
    </div>
    <BoardId id={contact[1].depositBoardId} />
  </Tooltip>
</section>
