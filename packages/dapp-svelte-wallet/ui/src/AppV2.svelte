<script>
  import 'smelte/src/tailwind.css';
  import { E } from '@agoric/eventual-send';
  import { afterUpdate, onMount } from 'svelte';

  import Button from 'smelte/src/components/Button';
  import Dapps from './Dapps.svelte';
  import Payments from './Payments.svelte';
  import Issuers from './Issuers.svelte';
  import Contacts from './Contacts.svelte';
  import Purses from './Purses.svelte';
  import Config from './Config.svelte';
  import Transactions from './Transactions.svelte';
  import { connected, ready } from './store';

  import ListItems from '../lib/ListItems.svelte';
  import MenuButton from '../lib/MenuButton.svelte';

  const menu = [
    { id: 'inbox', text: 'Inbox' },
    { id: 'transfers', text: 'Transfers' },
    { id: 'setup', text: 'Setup' },
  ];

  let navPanel = 'inbox';

  import { ThemeWrapper } from 'svelte-themer';

  connected.connect();

  $: connectStatus = $connected ? 'Connected' : 'Disconnected';
  $: connectLabel = $connected ? 'Disconnect' : 'Connect';
  $: connectAction = $connected ? connected.disconnect : connected.connect;
</script>

<style>
  :global(html) {
    --text-color-normal-v2: green;
    --text-color-light-v2: #273242;
    color: var(--theme-text);
    --agoric-bg-v2: rgb(255, 255, 255);
    --banner-height-v2: 64px;
    --content-width-v2: 1024px;
  }

  :global(.highlighted) {
    color: var(--text-color-light-v2);
  }

  :global(body) {
    padding-top: var(--banner-height-v2);
    color: var(--theme-text);
  }

  :global([data-theme='dark']) {
    --text-color-normal-v2: hsl(210, 10%, 62%);
    --text-color-light-v2: hsl(210, 15%, 35%);
    --text-color-richer-v2: hsl(210, 50%, 72%);
    --text-color-highlight-v2: hsl(25, 70%, 45%);
  }

  img {
    max-width: 100%;
    size: auto;
  }

  .disconnected-background {
    position: absolute;
    top: var(--banner-height-v2);
    left: 0;
    width: 100%;
    height: calc(max(100%, 100vh) - var(--banner-height-v2));
    border: none;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }

  header {
    border-bottom: 1px solid #eaecef;
    margin: auto;
    color: #ab2328;
    background-color: var(--agoric-bg-v2);
    padding: 10px 20px;
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--agoric-bg-v2);
    width: 100%;
    height: var(--banner-height-v2);
    z-index: 25;
    display: flex;
    align-items: baseline;
    flex-shrink: 0;
    justify-content: space-between;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  header > a {
    text-decoration: none;
  }

  .product-logo {
    transform: scale(0.85);
  }

  .site-name {
    align-self: baseline;
    color: #2c3e50;
    left: -16px;
    position: relative;
    font-size: 18px;
    font-weight: 600;
  }

  main {
    padding: 8px;
    max-width: var(--content-width-v2);
    margin: 1em auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 10px;
  }

  footer {
    min-height: var(--banner-height-v2);
    max-width: var(--content-width-v2);
    padding: 8px;
    margin: auto;
    /* padding: 2em 3em; */

    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  .theme-hidden {
    display: none;
  }

  .full {
    grid-column: 1 / span 2;
  }
</style>

<svelte:head>
  <title>Agoric Wallet</title>
</svelte:head>

<ThemeWrapper>
  <header>
    <a href="https://agoric.com" class="flex items-center">
      <img
        src="https://agoric.com/wp-content/themes/agoric_2021_theme/assets/img/logo.svg"
        class="product-logo"
        alt="Agoric"
        width="200"
        height="43" />
      <div class="site-name">Wallet</div>
    </a>
  </header>
  {#if !$ready}
    <div
      class="disconnected-background"
      on:click|preventDefault|stopPropagation={() => {}} />
  {/if}

  <main>
    {#if navPanel === 'transfers'}
      <div class="full">
        <Purses />
      </div>
      <div class="full">
        <Contacts />
      </div>
      <!-- <div class="history">
          <History />
        </div> -->
    {:else if navPanel === 'setup'}
      <!-- Issuers
          Payees
          Apps
          Instances
          Installations -->
      <div class="dapps">
        <Dapps />
      </div>
      <div class="issuers">
        <Issuers />
      </div>
      <div class="full">
        <Contacts />
      </div>
    {:else}
      <!-- inbox -->
      <div class="full">
        <Transactions />
      </div>
      <div class="payments">
        <Payments />
      </div>
      <div class="dapps">
        <Dapps />
      </div>
      <div class="transfers">
        <Purses />
      </div>
    {/if}
  </main>

  <footer>
    <div class={navPanel === "setup" ? "theme" : "theme-hidden"}>
      <Config />
    </div>
  </footer>
</ThemeWrapper>
