<script>
  import Amount from "./Amount.svelte";
  import Chip from "../lib/Chip.svelte";
  import Debug from "../lib/Debug.svelte";
  import { E } from "@agoric/eventual-send";
  import { purses } from './store';
  import Button from "smelte/src/components/Button/Button.svelte";
  import Select from "smelte/src/components/Select/Select.svelte";
  import ProgressCircular from 'smelte/src/components/ProgressCircular';
  import Request from "./Request.svelte";
  import Tooltip from 'smelte/src/components/Tooltip';

  export let item;
  export let dismiss;

  let destination = null;

  $: deposit = () => {
    return E(item.actions).deposit(destination ? destination.purse : undefined);
  };

  $: purseItems = [
    { value: null, text: 'Automatic' },
    ...$purses.filter(({ brand }) => brand === item.brand).map(p => ({ value: p, text: p.text }))
  ];
</script>

<style>
  .bottom {
    align-items: center;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .actions {
    align-items: center;
    display: flex;
    flex-direction: row-reverse;
  }

  .actions > span {
    margin-right: 8px;
  }

  :global(.refresh-button button) {
    padding: 8px;
  }

  :global(.refresh-button i) {
    font-size: 24px;
  }

  :global(.select-purse input) {
    border-bottom-width: 0px;
    background-color: #fdfdfd;
  }
</style>

<Request dismiss={dismiss} completed={item.status === 'deposited'}>
  <span slot="header">
    Incoming Payment
  </span>
  
  {#if item.status === 'deposited'}
    Deposited <Amount amount={item.displayPayment.depositedAmount}
                displayInfo={item.displayPayment.displayInfo} />
  {:else}
    <span class="amount">
      {#if item.lastAmount}
        <Amount amount={item.displayPayment.lastAmount}
          displayInfo={item.displayPayment.displayInfo}  />
      {:else}
        <ProgressCircular size={24}></ProgressCircular>
      {/if}
    </span>

    {#if $purses}
      <span class="select-purse">
        <Select bind:value={destination}
          items={purseItems}
          label="Deposit to" />
      </span>
      <span class="bottom">
        <Debug title="Payment Detail" target={item} />
        <div class="actions">
          <span class="deposit-button">
            <Chip selected icon="check" color="success" on:click={deposit}>
              Deposit
            </Chip>
          </span>
          <span class="refresh-button">
            <Tooltip>
              <span slot="activator">
                <Button icon={"refresh"}
                  on:click={() => E(item.actions).getAmountOf()}
                  color="error"
                  text flat />
              </span>
              Refresh
            </Tooltip>
          </span>
        </div>
      </span>
    {:else}
      Unknown brand.  This payment cannot be verified.
    {/if}
  {/if}
</Request>
