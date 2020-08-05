<script>
  import ListItems from "../lib/ListItems.svelte";
  import Amount from "./Amount.svelte";
  import Payment from './Payment.svelte';
  export let payments;
</script>

<style>
  div {
    margin: 1rem;
    /* border: 1px solid grey; */
  }
</style>

<section>
  <h2>Incoming Payments</h2>
  <ListItems items={$payments}>
    <div slot="item" let:item>
      <Payment payment={item} />
    </div>
    <p slot="empty">No payments.</p>
  </ListItems>
</section>
