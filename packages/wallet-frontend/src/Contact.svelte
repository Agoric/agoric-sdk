<script>
  import BoardId from "./BoardId.svelte";
  import Petname from './Petname.svelte';

  export let contact;
</script>

<style>

</style>

<section>
  <Petname name={contact[0]} />
  (<BoardId id={contact[1].depositBoardId} />)
</section>
