<script>
    import { inbox } from './store';

    $: items = ($inbox || []).filter(({ status }) => status === undefined || status === 'pending');
</script>
<style>
    .content {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
    }

    .splash-image {
        opacity: 0.6;
    }
</style>
<div>
    <h1>Inbox</h1>
    <div class="content">
        {#if items.length === 0}
            <img class="splash-image"
                src="generic-agoric.svg"
                alt="Empty Inbox"
                width="460"
                height="460" />
            <p class="text-gray-700">
                There's nothing here.
            </p>
        {/if}
    </div>
</div>