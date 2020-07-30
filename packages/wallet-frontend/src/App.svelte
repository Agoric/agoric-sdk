<script>
  import Dapps from "./Dapps.svelte";
  import Payments from './Payments.svelte';
  import Purses from "./Purses.svelte";
  import Transactions from "./Transactions.svelte";
  import { dapps, payments, purses, inbox, connected, walletP } from "./store";

  connected.connect();
</script>

<main>
  <h1>Agoric Wallet</h1>
  {#if $connected}
    <b>Connected</b>
    <button on:click={connected.disconnect}>Disconnect</button>
  {:else}
    <b>Disconnected</b>
    <button on:click={connected.connect}>Connect</button>
  {/if}
  <h2>Dapps</h2>
  <Dapps {dapps} />

  <h2>Purses</h2>
  <Purses {purses} />

  <h2>Incoming Payments</h2>
  <Payments {payments} />

  <h2>Transactions</h2>
  <Transactions {inbox} {walletP} />
</main>
