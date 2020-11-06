<script>
  import Amount from "./Amount.svelte";
  import Petname from "./Petname.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import BoardId from "./BoardId.svelte";
  import { purses } from './store';
import Button from "smelte/src/components/Button/Button.svelte";
import Select from "smelte/src/components/Select/Select.svelte";

  export let item;
  export let summary = true;
  export let summaryLine = 0;
  export let details = true;

  let destination = null;

  $: deposit = () => {
    // console.log('deposit to', destination);
    return E(item.actions).deposit(destination ? destination.purse : undefined);
  };

  $: purseItems = [
    { value: null, text: 'Automatic' },
    ...$purses.filter(({ brand }) => brand === item.brand).map(p => ({ value: p, text: p.text }))
  ];
  // $: console.log('purseItems', purseItems);
</script>

<section>
  <div>
    {#if item.status === 'deposited'}
      {#if summary}
        Deposited <Amount amount={item.displayPayment.depositedAmount} displayInfo={item.displayPayment.displayInfo} />
      {/if}
    {:else if item.issuer}
      {#if summary}
        {#if !summaryLine || summaryLine === 1}
        Payment amount
        {/if}
        {#if item.lastAmount && (!summaryLine || summaryLine === 2)}
          <Amount amount={item.displayPayment.lastAmount} displayInfo={item.displayPayment.displayInfo}  />
        {/if}
      {/if}
    
      {#if details}
      {#if $purses}
        <Select bind:value={destination} items={purseItems} label="Deposit to" />
      {/if}
      <div>
        <Button on:click={() => E(item.actions).getAmountOf()}>Refresh</Button>
        <Button on:click={deposit}>Deposit</Button>
      </div>
      {/if}
    {:else}
      {#if summary && (!summaryLine || summaryLine === 1)}
      Unknown brand.  This payment cannot be verified.
      {/if}
    {/if}
    {#if details}
      <Debug title="Payment Detail" target={item} />
    {/if}
  </div>
</section>
