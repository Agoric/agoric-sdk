<script>
  import ListItems from "../lib/ListItems.svelte";
  import Transaction from "./Transaction.svelte";

  export let inbox;
  export let walletP;
</script>

<style>
  div {
    margin: 1rem;
    /* border: 1px solid grey; */
  }
</style>

<section>
  <h2>Transactions</h2>
  <ListItems items={$inbox}>
    <div slot="item" let:item>
      <Transaction txn={item} id={item.id} {walletP} />
    </div>
    <p slot="empty">No transactions.</p>
  </ListItems>
</section>
