<script>
  import { E } from "@agoric/eventual-send";
  import ListItems from "../lib/ListItems.svelte";
  import Dapp from "./Dapp.svelte";

  export let dapps;
</script>

<style>
  div {
    margin: 1rem;
    /* border: 1px solid grey; */
  }
</style>

<section>
  <h2>Dapps</h2>
  <ListItems items={$dapps} idFn={item => item.origin}>
    <div slot="item" let:item>
      <Dapp dapp={item} />
    </div>
    <p slot="empty">No dapps.</p>
  </ListItems>
</section>
