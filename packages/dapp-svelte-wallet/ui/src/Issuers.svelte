<script>
  import { E } from '@agoric/eventual-send';
  import Card from 'smelte/src/components/Card';
  import List from 'smelte/src/components/List';

  import Import from './Import.svelte';
  import Issuer from "./Issuer.svelte";

  import { issuers, walletP } from './store';

  function cmp(a, b) {
    return a < b ? -1 : a === b ? 0 : 1;
  }

  $: issuerItems = $issuers ? [...$issuers].sort((a, b) => cmp(a[0], b[0])) : [];
</script>

<Card.Card class="fullwidth px-2 py-2">
  <div slot="title">
    <Card.Title
      title="Issuers"
      subheader="Verifiers of digital assets"
    />
  </div>

  <!-- All {JSON.stringify($issuers)} -->
  {#if !Array.isArray($issuers) || $issuers.length === 0}
    No issuers.
  {:else}
    <List items={issuerItems}>
      <div slot="item" class="px-1" let:item={item}>
        <Issuer issuer={item} />
      </div>
    </List>
  {/if}

  <div slot="actions">
    <Import name="Issuer"
      adder={(petname, obj) => E(walletP).addIssuer(petname, obj, true)}>Import</Import>
  </div>
</Card.Card>
