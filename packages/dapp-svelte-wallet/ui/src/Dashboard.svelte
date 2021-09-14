<script>
    import Balances from './Balances.svelte';
    import Requests from './Requests.svelte';

    export let navPanel;
</script>
<style>
    .content {
        width: calc(var(--nav-offset-width) + var(--content-width-v2));
        display: flex;
        flex-direction: row;
        flex-wrap: wrap-reverse;
        align-items: flex-end;
        justify-content: start;
        max-width: 100%;
    }

    :global(.balances) {
        margin: 16px 32px 32px 0;
        min-width: 300px;
        min-height: 460px;
    }

    :global(.requests) {
        min-width: 460px;
        margin: 16px 0 16px;
        min-height: 460px;
    }

    @media only screen and (max-width: 768px) {
        .content {
            justify-content: center;
        }
    }
</style>
<div>
    <h1>Dashboard</h1>
    <div class="content">
        <Balances bind:navPanel={navPanel}
            classes="balances" />
        <Requests classes="requests"></Requests>
    </div>
</div>