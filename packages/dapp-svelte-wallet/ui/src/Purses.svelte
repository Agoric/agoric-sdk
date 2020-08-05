<script>
  import ListItems from "../lib/ListItems.svelte";
  import Purse from "./Purse.svelte";
  
  // a store of purses
  export let purses;
  export let walletP;
</script>

<style>
  div {
    margin: 1rem;
    /* border: 1px solid grey; */
  }
</style>

<section>
  <h2>Purses</h2>
  <ListItems items={$purses}>
    <div slot="item" let:item>
      <Purse purse={item} {walletP} />
    </div>
    <p slot="empty">No purses.</p>
  </ListItems>
</section>
