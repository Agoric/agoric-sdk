
<script>
    import TransactionV2 from './TransactionV2.svelte';
    import DappV2 from './DappV2.svelte';
    import PaymentV2 from './PaymentV2.svelte';

    import { inbox, dapps, payments, purses, dismissedDapps } from './store';

    export let classes = '';

    const hasAutoDeposit = (payment) =>
        $purses.filter((p) =>
            p.brand === payment.brand && (p.depositBoardId || '').length
        ).length;

    $: incomingPayments = ($payments || []).filter((i) => 
        i.status !== 'deposited' && !hasAutoDeposit(i));
    $: offers = ($inbox || []).filter(({ status }) => 
        status === undefined || status === 'pending');
    $: dappConnections = ($dapps || []).filter(({ enable, dappOrigin, origin }) => 
        !enable && !$dismissedDapps.includes(dappOrigin || origin))

    $: mappedPayments = incomingPayments.map((i) => {
        return {
            type: 'payment',
            data: i,
            id: i.displayPayment.payment.petname,
        };
    });
    $: mappedOffers = offers.map((i) => { 
        return {
            type: 'transaction',
            data: i,
            id: i.id,
        };
    });
    $: mappedDapps = dappConnections.map((i) => { 
        return {
            type: 'dapp',
            data: i,
            id: i.dappOrigin || i.origin,
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

    .empty {
        animation: fadeIn 2s;
        text-align: center;
    }

    @keyframes fadeIn {
        0% { opacity: 0; }
        5% { opacity: 0; }
        100% { opacity: 1; }
    }
</style>
 
<div class={`content ${classes}`}>
    {#if items.length}
        {#each items as item (item.id)}
            {#if item.type === "transaction"}
                <TransactionV2 item={item.data} />
            {:else if item.type === "payment"}
                <PaymentV2 item={item.data} />
            {:else}
                <DappV2 item={item.data} />
            {/if}
        {/each}
    {:else}
        <div class="empty">
            <img class="splash-image"
                src="generic-agoric.svg"
                alt="Empty Inbox"
                width="320"
                height="320" />
            <p class="text-gray-700">
                No requests.
            </p>
        </div>
    {/if}
</div>
