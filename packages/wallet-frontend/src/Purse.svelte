<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  
  export let purse;
</script>

<style>
</style>

<section>
  <Petname name={purse.pursePetname} /> <Debug title="Amount Detail" target={purse.currentAmount} />
  <Amount amount={purse.currentAmount} />
</section>
