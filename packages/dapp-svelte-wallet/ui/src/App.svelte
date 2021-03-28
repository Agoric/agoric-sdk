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

  // Compute the banner height from actual rendering.
  const calculateBannerHeight = () => {
    const headerHeight = document.querySelector('header.topmost').clientHeight;
    document.documentElement.style.setProperty('--banner-height', `${headerHeight}px`);
  };
  onMount(() => {
    window.addEventListener('resize', calculateBannerHeight);
    return () => {
      window.removeEventListener('resize', calculateBannerHeight);
    };
  });
  afterUpdate(calculateBannerHeight);
</script>

<style>
  :global(html) {
    --text-color-normal: green;
    --text-color-light: #273242;
    color: var(--theme-text);
    --agoric-bg: rgb(215, 50, 82);
    --banner-height: 70px;
    --content-width: 1024px;
  }
  :global(.highlighted) {
    color: var(--text-color-light);
  }
  :global(body) {
    padding-top: var(--banner-height);
    color: var(--theme-text);
  }
  :global([data-theme='dark']) {
    --text-color-normal: hsl(210, 10%, 62%);
    --text-color-light: hsl(210, 15%, 35%);
    --text-color-richer: hsl(210, 50%, 72%);
    --text-color-highlight: hsl(25, 70%, 45%);
  }
  img {
    max-width: 100%;
    size: auto;
  }
  .header-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--agoric-bg);
    width: 100%;
    height: var(--banner-height);
    z-index: 25;
    border-bottom: 1px solid var(--color-primary-700);
  }
  .disconnected-background {
    position: absolute;
    top: var(--banner-height);
    left: 0;
    width: 100%;
    height: calc(max(100%, 100vh) - var(--banner-height));
    border: none;
    background: rgba(0, 0, 0, 0.4);
    z-index: 1000;
  }

  header {
    z-index: 30;
    min-height: 70px; /* var(--banner-height); */
    max-width: var(--content-width);
    margin: auto;
    color: #f1f1f1;
    background-color: var(--agoric-bg);
    padding: 10px 20px;

    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: space-between;
    flex-wrap: wrap;
  }

  nav {
    display: flex;
    align-items: center;
  }
  nav :global(button) {
    /* remove the padding at the bottom */
    margin: auto;
  }
  nav h6 {
    text-transform: uppercase;
    font-size: 10px;
    font-style: italic;
  }
  .connector {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 10rem;
  }

  main {
    padding: 8px;
    max-width: var(--content-width);
    margin: 1em auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-gap: 10px;
  }
  footer {
    min-height: var(--banner-height);
    max-width: var(--content-width);
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

  .bottom {
    position: absolute;
    bottom: calc(20px + var(--banner-height));
    margin: 20px;
    z-index: 32;
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

<ThemeWrapper>
  <div class="header-wrapper">
    <header class="topmost">
      <a href="https://agoric.com" class="flex items-center">
        <img src="logo.png" alt="Agoric" width="200" height="43" />
      </a>
      <!-- <h4>Wallet</h4> -->
      <nav>
        <ListItems horizontal items={menu} on:change>
          <div slot="item" let:item>
            <MenuButton id={item.id} text={item.text} bind:value={navPanel} color="primary"/>
          </div>
        </ListItems>

        <div class="connector">
          <h6>{connectStatus}</h6>
          <Button
            small
            text
            fab
            flat
            title={connectLabel}
            on:click={connectAction}>
            {connectLabel}
          </Button>
        </div>
      </nav>
    </header>
  </div>
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
