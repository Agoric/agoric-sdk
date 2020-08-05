<script>
  import { E } from '@agoric/eventual-send';
  import Card from 'smelte/src/components/Card';
  
  import Issuer from './Issuer.svelte';
  import Import from './Import.svelte';

  import { issuers, walletP } from './store';
  import ListCard from '../lib/ListCard.svelte';

  function cmp(a, b) {
    return a < b ? -1 : a === b ? 0 : 1;
  }

  $: issuerItems = $issuers ? [...$issuers].sort((a, b) => cmp(a[0], b[0])) : [];
</script>

<ListCard items={issuerItems}>
  <div slot="title">
    <Card.Title
      title="Issuers"
    />
  </div>

  <div slot="none">
    No issuers.
  </div>

  <div slot="item-header" let:item>
    <Issuer {item} summary={true} />
  </div>

  <div slot="item-details" let:item>
    <Issuer {item} details={true} />
  </div>

  <div slot="actions">
    <Import name="Issuer"
      adder={(petname, obj) => E(walletP).addIssuer(petname, obj, true)}>Import</Import>
  </div>
</ListCard>
