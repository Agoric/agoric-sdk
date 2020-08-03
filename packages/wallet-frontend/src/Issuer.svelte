<script>
  import BoardId from "./BoardId.svelte";
  import MakePurse from './MakePurse.svelte';
  import Petname from './Petname.svelte';

  export let issuer;
</script>

<style>

</style>

<section>
  <Petname name={issuer[0]} /> <MakePurse issuerPetname={issuer[0]} />
  (<BoardId id={issuer[1].issuerBoardId} />)
</section>
