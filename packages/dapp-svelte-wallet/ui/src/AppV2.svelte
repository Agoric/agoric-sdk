<script>
  import 'smelte/src/tailwind.css';
  import { E } from '@agoric/eventual-send';
  import { afterUpdate, onMount } from 'svelte';

  import Button from 'smelte/src/components/Button';
  import Tooltip from 'smelte/src/components/Tooltip';
  import Menu from 'smelte/src/components/Menu';
  import Dapps from './Dapps.svelte';
  import Payments from './Payments.svelte';
  import Dashboard from './Dashboard.svelte';
  import PursesV2 from './PursesV2.svelte';
  import DappsV2 from './DappsV2.svelte';
  import ContactsV2 from './ContactsV2.svelte';
  import IssuersV2 from './IssuersV2.svelte';
  import History from './History.svelte';

  import Config from './Config.svelte';
  import NavMenu from './NavMenu.svelte';
  import { connected, ready } from './store';
  import { setWalletConnection } from './wallet-admin.js';

  const menu = [
    { id: 'dashboard', text: 'Dashboard', icon: 'dashboard' },
    { id: 'purses', text: 'Purses', icon: 'account_balance_wallet' },
    { id: 'dapps', text: 'Dapps', icon: 'apps' },
    { id: 'contacts', text: 'Contacts', icon: 'people' },
    { id: 'issuers', text: 'Issuers', icon: 'arrow_circle_right' },
  ];

  let navPanel = 'dashboard';
  let isNavMenuExpanded = true;
  let isMobileLayout = false;

  import { ThemeWrapper } from 'svelte-themer';

  connected.connect();

  $: connectLabel = $connected ? 'Disconnect' : 'Connect';
  $: connectAction = $connected ? connected.disconnect : connected.connect;

  // Adjust layout for small screens.
  const calculateLayoutSize = () => {
    isMobileLayout = window.innerWidth < 769;
  };
  onMount(() => {
    window.document.documentElement.style.setProperty('--theme-background', '#fff');
    window.addEventListener('resize', calculateLayoutSize);
    return () => {
      window.removeEventListener('resize', calculateLayoutSize);
    };
  });
  afterUpdate(calculateLayoutSize);
</script>

<style>
  :global(html) {
    --text-color-normal-v2: green;
    --text-color-light-v2: #273242;
    color: var(--theme-text);
    --agoric-bg-v2: rgb(255, 255, 255);
    --banner-height-v2: 64px;
    --content-width-v2: 1024px;
    --nav-offset-width: 272px;
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
    z-index: 21;
  }

  header {
    border-bottom: 1px solid #eaecef;
    margin: auto;
    color: #ab2328;
    background-color: var(--agoric-bg-v2);
    position: absolute;
    top: 0;
    left: 0;
    background-color: var(--agoric-bg-v2);
    width: 100%;
    height: var(--banner-height-v2);
    z-index: 25;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: space-between;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  a {
    text-decoration: none;
  }

  .product-link {
    margin-left: 16px;
  }

  .product-logo {
    transform: scale(0.85);
  }

  main {
    width: 100%;
    padding: 32px 32px 32px 272px;
    position: fixed;
    height: calc(100vh - 64px);
    top: 64px;
    overflow-y: auto;
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

  .app-bar-section {
    display: flex;
    flex-direction: row;
    padding: 4px;
    height: 100%;
  }

  .connector {
    margin-right: 16px;
  }

  .connection-indicator {
    pointer-events: none; 
    position: absolute;
    height: 8px;
    width: 8px;
    background-color: #00c853;
    border-radius: 4px;
    top: 34px;
    left: 34px;
  }

  .connection-indicator.disconnected {
    background-color: #e0e0e0;
    border-color: #9e9e9e;
    border-width: 1px;
  }

  :global(.app-bar-section button) {
    padding: 12px;
  }

  :global(.app-bar-section i) {
    color: #cb2328;
    font-size: 32px;
  }

  .product-link {
    margin-left: 16px;
  }

  @media only screen and (max-width: 768px) {
    main {
      padding: 16px 24px;
    }

    .product-link {
      margin-left: 0;
    }
  }
</style>

<svelte:head>
  <title>Agoric Wallet</title>
</svelte:head>

<agoric-wallet-connection style="display: none" on:state={ev => {
  setWalletConnection(ev.detail.walletConnection);
}}></agoric-wallet-connection>

<ThemeWrapper>
  <header>
    <div class="app-bar-section">
      <div>
        {#if isMobileLayout}
          <Button
            on:click={() => isNavMenuExpanded = !isNavMenuExpanded}
            color="primary"
            icon="menu" text light flat />
        {/if}
      </div>
      <a href="https://agoric.com" class="flex items-center product-link">
        <img
          src="https://agoric.com/wp-content/themes/agoric_2021_theme/assets/img/logo.svg"
          class="product-logo"
          alt="Agoric"
          width="200"
          height="43" />
      </a>
    </div>
    <div class="app-bar-section">
      <div class="connector">
          <Tooltip>
            <div slot="activator">
              <Button
                on:click={connectAction}
                color="primary"
                icon="public"
                text light flat />
              <div class={`connection-indicator ${$connected ? "" : "disconnected"}`}/>
            </div>
            {connectLabel}
          </Tooltip>
      </div>
    </div>
  </header>
  {#if !$ready}
    <div
      class="disconnected-background"
      on:click|preventDefault|stopPropagation={() => {}} />
  {/if}
  <NavMenu
    bind:navPanel={navPanel}
    bind:isExpanded={isNavMenuExpanded}
    isDrawer={isMobileLayout}
    menu={menu}>
  </NavMenu>
  <main>
    {#if navPanel === 'purses'}
      <PursesV2/>
    {:else if navPanel === 'dapps'}
      <DappsV2 />
    {:else if navPanel === 'contacts'}
      <ContactsV2 />
    {:else if navPanel === 'issuers'}
      <IssuersV2 />
    {:else if navPanel === 'history'}
      <History />
    {:else}
      <Dashboard bind:navPanel={navPanel} />
    {/if}
  </main>

  <footer>
    <div class={navPanel === "setup" ? "theme" : "theme-hidden"}>
      <Config />
    </div>
  </footer>
</ThemeWrapper>
