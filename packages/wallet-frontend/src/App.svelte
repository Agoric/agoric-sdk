<script>
  import { E } from '@agoric/eventual-send';

  import { Button, Icon } from "svelte-mui";
  import Dapps from "./Dapps.svelte";
  import Payments from "./Payments.svelte";
  import Purses from "./Purses.svelte";
  import Transactions from "./Transactions.svelte";
  import { dapps, payments, purses, inbox, connected, walletP } from "./store";

  import { ThemeWrapper, ThemeToggle } from "svelte-themer";

  connected.connect();
</script>

<style>
  :global(html) {
    --text-color-normal: green;
    --text-color-light: #8cabd9;
    color: var(--theme-text);
  }
  :global(.highlighted) {
    color: var(--text-color-light);
  }
  :global(body) {
    color: var(--theme-text);
  }
  :global([data-theme="dark"]) {
    --text-color-normal: hsl(210, 10%, 62%);
    --text-color-light: hsl(210, 15%, 35%);
    --text-color-richer: hsl(210, 50%, 72%);
    --text-color-highlight: hsl(25, 70%, 45%);
  }
  h1.xxx {
    color: var(--text-color-normal);
  }

  .container {
    display: grid;

    grid-template-areas:
      "header header header"
      "nav content side"
      "footer footer footer";

    grid-template-columns: 200px 1fr 200px;
    grid-template-rows: auto 1fr auto;
    grid-gap: 10px;

    height: 100vh;
  }
  header {
    grid-area: header;
    display: grid;
    grid-template-columns: 1fr auto auto;
    background-color: #ab2328;
    color: #f1f1f1;
    padding: 10px 20px;
  }
  .controls {
    margin: auto;
  }
  nav {
    grid-area: nav;
    margin-left: 0.5rem;
  }
  main {
    grid-area: content;
    padding: 8px;
  }
  aside {
    grid-area: side;
    margin-right: 0.5rem;
  }
  footer {
    grid-area: footer;
  }

  main {
    display: grid;
    grid-template-areas: 
      "dapps dapps"
      "txns txns"
      "payments payments"
      "purses issuers";
    grid-template-columns: 1fr 1fr;
    grid-gap: 10px;

    height: 100vh;
  }
  .dapps {
    grid-area: dapps;
  }

  .purses {
    grid-area: purses;
  }

  .payments {
    grid-area: payments;
  }

  .txns {
    grid-area: txns;
  }
  .issuers {
    grid-area: issuers;
  }

/* DEBUGGING */
  /* * {
    border: 1px solid red;
  }
  :global(*) {
    border: thin dashed gray;
  } */

</style>

<svelte:head>
  <title>Agoric Wallet</title>
</svelte:head>

<div class="container">
  <ThemeWrapper>
    <header>
      <h1>Agoric Wallet</h1>
      <div class="controls">
        {#if $connected}
          <b>Connected</b>
          <Button
            outlined
            dense
            title="Disconnect"
            on:click={connected.disconnect}>
            Disconnect
          </Button>
        {:else}
          <b>Disconnected</b>
          <Button outlined dense title="Connect" on:click={connected.connect}>
            Connect
          </Button>
        {/if}
      </div>
    </header>

    <main>
      <div class="dapps">
        <h2>Dapps</h2>
        <Dapps {dapps} />
      </div>
      <div class="payments">
        <h2>Incoming Payments</h2>
        <Payments {payments} />
      </div>
      <div class="txns">
        <h2>Transactions</h2>
        <Transactions {inbox} {walletP} />
      </div>
      <div class="purses">
        <h2>Purses</h2>
        <Purses {purses} />
      </div>
      <div class="issuers">
        <h2>Issuers</h2>
        Nothing here yet
      </div>
    </main>

    <nav>
      <!-- Navigation -->
    </nav>
    <aside>
      <!-- Sidebar / Ads -->
    </aside>
    <footer>
      <ThemeToggle />
    </footer>
  </ThemeWrapper>
</div>
