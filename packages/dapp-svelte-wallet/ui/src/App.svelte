<script>
  import "smelte/src/tailwind.css";
  import { E } from "@agoric/eventual-send";

  import Button from "smelte/src/components/Button";
  import Dapps from "./Dapps.svelte";
  import Payments from "./Payments.svelte";
  import Issuers from "./Issuers.svelte";
  import Contacts from "./Contacts.svelte";
  import Purses from "./Purses.svelte";
  import Transactions from "./Transactions.svelte";
  import { connected } from "./store";

  import { ThemeWrapper, ThemeToggle } from "svelte-themer";

  connected.connect();

  $: connectStatus = $connected ? "Connected" : "Disconnected";
  $: connectLabel = $connected ? "Disconnect" : "Connect";
  $: connectAction = $connected ? connected.disconnect : connected.connect;
</script>

<style>
  :global(html) {
    --text-color-normal: green;
    --text-color-light: #8cabd9;
    color: var(--theme-text);
    --agoric-bg: #ab2328;
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

  .banner { 
    position: absolute; 
    top: 0; 
    left: 0; 
    background-color: var(--agoric-bg);
    width: 100%; 
    height: 70px;
    z-index: -1;
    border: none;
  }
  .disconnected-background {
    position: absolute; 
    top: 70px; 
    left: 0; 
    width: 100%; 
    height: 100%;
    border: none;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }

  .container {
    display: grid;
    grid-template-areas:
      "header header"
      "content content"
      "footer footer";
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto 1fr auto;
    grid-gap: 10px;
    margin: auto;
  }
  header {
    grid-area: header;
    display: grid;
    grid-template-columns: 1fr auto;
    color: #f1f1f1;
    padding: 10px 20px;
    background-color: var(--agoric-bg);
  }

  .controls > * {
    margin: 8px;
    align-items: center;
    display: inline-flex;
  }
  main {
    grid-area: content;
    padding: 8px;
  }
  footer {
    grid-area: footer;
    /* margin: 2em; */
  }

  main {
    display: grid;
    grid-template-areas:
      "dapps dapps"
      "txns txns"
      "payments payments"
      "history history"
      "purses issuers"
      "contacts contacts";
    grid-template-columns: 1fr 1fr;
    grid-gap: 10px;
    /* margin: 2em; */
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
  .contacts {
    grid-area: contacts;
  }
  .history {
    grid-area: history;
    min-height: 30px;
  }

  /* DEBUGGING */
  /* * {
    border: 1px solid red;
  } */

  /* :global(*) {
    border: thin dashed gray;
  }  */
</style>

<svelte:head>
  <title>Agoric Wallet</title>
</svelte:head>
<div class="banner" />

<div class="container">
  <ThemeWrapper>
    <header>
      <h1>Agoric Wallet</h1>
      <div class="controls">
        <b>{connectStatus}</b>
        <Button  tiny fab flat title={connectLabel} on:click={connectAction}>
          {connectLabel}
        </Button>
      </div>
    </header>
    {#if !$connected}
      <div
        class="disconnected-background"
        on:click|preventDefault|stopPropagation={() => {}} />
    {/if}

    <main>
      <div class="dapps">
        <Dapps />
      </div>
      <div class="payments">
        <Payments />
      </div>
      <div class="txns">
        <Transactions />
      </div>
      <div class="purses">
        <Purses />
      </div>
      <div class="issuers">
        <Issuers />
      </div>
      <div class="contacts">
        <Contacts />
      </div>
      <!-- <div class="history">
        <History />
      </div> -->
    </main>
    <footer>
      <ThemeToggle />
    </footer>
  </ThemeWrapper>
</div>
