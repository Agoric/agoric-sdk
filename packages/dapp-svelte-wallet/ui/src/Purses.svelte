<script>
  import ListCard from '../lib/ListCard.svelte';
  import Purse from "./Purse.svelte";
  import Card from 'smelte/src/components/Card';

  import { purses } from './store';
</script>

<ListCard items={$purses} storeKey="purses">
  <div slot="title">
    <Card.Title title="Purses" />
  </div>

  <div slot="empty">
    No purses.
  </div>

  <div slot="item-header" let:item>
    <Purse {item} details={false} summaryLine={1} />
  </div>

  <div slot="item-header-rest" let:item>
    <Purse {item} details={false} summaryLine={2} />
  </div>

  <div slot="item-details" let:item>
    <Purse {item} summary={false}/>
  </div>
</ListCard>
