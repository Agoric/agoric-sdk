<script>
  import Purses from "./Purses.svelte";
  import Transactions from "./Transactions.svelte";
  import { purses, inbox, connected, accept, decline, cancel } from "./store";
  connected.connect();
</script>

<main>
  <h1>Simple Agoric Wallet</h1>
  {#if $connected}
    <b>Connected</b>
    <button on:click={connected.disconnect}>Disconnect</button>
  {:else}
    <b>Disconnected</b>
    <button on:click={connected.connect}>Connect</button>
  {/if}
  <h2>Purses</h2>
  <Purses {purses} />

  <h2>Transactions</h2>
  <Transactions {inbox} dispatch={{ accept, decline, cancel }} />
</main>
