<script>
  import ListItems from "../lib/ListItems.svelte";
  import Amount from "./Amount.svelte";
  import Payment from './Payment.svelte';

  import { payments } from './store';
import ListCard from "../lib/ListCard.svelte";
import Card from "smelte/src/components/Card";

$: paymentItems = $payments.filter(pmt => pmt.status !== 'deposited');
</script>

<ListCard items={paymentItems} storeKey="payments.true" expandDefault={true}>
  <div slot="title">
    <Card.Title title="Incoming Payments" />
  </div>

  <div slot="empty">No incoming payments.</div>

  <div slot="item-header" let:item>
    <Payment {item} details={false} summaryLine={1} />
  </div>

  <div slot="item-header-rest" let:item>
    <Payment {item} details={false} summaryLine={2} />
  </div>

  <div slot="item-details" let:item>
    <Payment {item} summary={false} />
  </div>
</ListCard>
