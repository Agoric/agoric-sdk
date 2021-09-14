
<script>
    import CardV2 from '../lib/CardV2.svelte';
    import TransactionV2 from './TransactionV2.svelte';
    import DappV2 from './DappV2.svelte';
    import PaymentV2 from './PaymentV2.svelte';
    import ProgressCircular from 'smelte/src/components/ProgressCircular';

    import { inbox, dapps, payments } from './store';

    export let classes = '';

    $: incomingPayments = ($payments || []).filter(({ status }) => status === undefined || status === 'pending');
    $: offers = ($inbox || []).filter(({ status }) => status === undefined || status === 'pending');
    $: dappConnections = ($dapps || []).filter(({ enable }) => !enable);

    $: mappedPayments = incomingPayments.map((i) => { 
        return {
            'type': 'payment',
            'data': i
        };
    });
    $: mappedOffers = offers.map((i) => { 
        return {
            'type': 'transaction',
            'data': i
        };
    });
    $: mappedDapps = dappConnections.map((i) => { 
        return {
            'type': 'dapp',
            'data': i
        };
    });

    $: items = [...mappedPayments, ...mappedOffers, ...mappedDapps];
</script>

<style>
    .splash-image {
        opacity: 0.6;
    }

    .content {
        align-items: center;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
    }

    h6 {
        font-size: 18px;
    }
</style>
 
<div class={`content ${classes}`}>
    {#if !items.length}
        <img class="splash-image"
            src="generic-agoric.svg"
            alt="Empty Inbox"
            width="320"
            height="320" />
        <p class="text-gray-700">
            No requests.
        </p>
    {:else}
        {#each items as item}
            {#if item.type === "transaction"}
                <TransactionV2 item={item.data} />
            {:else if item.type === "payment"}
                <PaymentV2 item={item.data} />
            {:else}
                <DappV2 item={item.data} />
            {/if}
        {/each}
    {/if}
</div>
