<script>
  import ListCard from '../lib/ListCard.svelte';
  import Transaction from "./Transaction.svelte";
  import Card from 'smelte/src/components/Card';

  import { inbox } from './store';
</script>

<!-- filter out the history -->
<ListCard
  items={($inbox || []).filter(({ status }) => status === undefined || status === 'pending')}
  storeKey="inbox"
  expandDefault={true}
>
  <div slot="title">
    <Card.Title title="Offers" />
  </div>

  <div slot="empty">
    No offers.
  </div>

  <div slot="item-header" let:item>
    <Transaction {item} details={false} summaryLine={1} />
  </div>

  <div slot="item-header-rest" let:item>
    <Transaction {item} details={false} summaryLine={2} />
  </div>

  <div slot="item-details" let:item>
    <Transaction {item} summary={false}/>
  </div>
</ListCard>
