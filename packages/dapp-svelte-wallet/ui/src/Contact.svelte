<script>
  import BoardId from "./BoardId.svelte";
  import Petname from './Petname.svelte';

  export let contact;
</script>

<style>
  section {
    padding: 10px;
    box-shadow: 2px 2px 8px 0 rgba(0, 0, 0, 0.5);
  }
</style>

<section>
  <Petname name={contact[0]} /> <BoardId id={contact[1].depositBoardId} />
</section>
