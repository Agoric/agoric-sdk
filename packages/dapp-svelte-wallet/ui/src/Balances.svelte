<script>
    import Balance from './Balance.svelte';
    import CardV2 from '../lib/CardV2.svelte';
    import Icon from 'smelte/src/components/Icon';
    import ProgressCircular from 'smelte/src/components/ProgressCircular';
    import Purse from './Purse.svelte';
    import Tooltip from 'smelte/src/components/Tooltip';
    import { purses } from './store';

    export let navPanel;
    export let classes = '';
</script>
 
<style>
    .content {
        align-items: center;
        display: flex;
        flex-direction: column;
    }

    .balance {
        width: 100%;
        padding: 0 16px 16px 16px;
    }

    .divider {
        width: 100%;
        margin-bottom: 16px;
        padding: 0;
        height: 1px;
        background-color: #eeeeee;
    }

    h6 {
        font-size: 18px;
    }

    .header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .purses-link {
        text-decoration: none;
        color: rgb(0,100,200);
        cursor: pointer;
        line-height: 16px;
        vertical-align: top;
        user-select: none;
    }
</style>

<CardV2 classes={classes}>
    <div slot="header" class="header">
        <h6>Balances</h6>
        <Tooltip>
            <div on:click={() => navPanel = 'purses'}
                slot="activator"
                class="purses-link">
                <Icon color="#00b0ff">
                    arrow_forward
                </Icon>
            </div>
            View purses
        </Tooltip>
    </div>
    <div class="content">
        {#if $purses === null}
            <ProgressCircular />
        {:else if !$purses.length}
            <p class="text-gray-700">
                No balances.
            </p>
        {:else}
            {#each $purses as item}
                <div class="balance">
                    <div class="divider" />
                    <Balance {item} />
                </div>
            {/each}
        {/if}
    </div>
</CardV2>