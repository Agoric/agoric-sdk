<script>
  import { E } from '@agoric/eventual-send';
  import Card from 'smelte/src/components/Card';
  import ListCard from '../lib/ListCard.svelte';
  
  import Issuer from './Issuer.svelte';
  import Import from './Import.svelte';

  import { issuers, walletP } from './store';
</script>

<ListCard items={$issuers} storeKey="issuers">
  <div slot="title">
    <Card.Title
      title="Issuers"
    />
  </div>

  <div slot="empty">
    No issuers.
  </div>

  <div slot="item-header" let:item>
    <Issuer {item} details={false} />
  </div>

  <div slot="item-details" let:item>
    <Issuer {item} summary={false} />
  </div>

  <div slot="actions">
    <Import name="Issuer"
      adder={(petname, obj) => E(walletP).addIssuer(petname, obj, true)}>Import</Import>
  </div>
</ListCard>
