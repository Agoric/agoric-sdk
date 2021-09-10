<script>
    import Button from 'smelte/src/components/Button';
    import List from 'smelte/src/components/List';
    import { ListItem } from 'smelte/src/components/List';
    import NavigationDrawer from 'smelte/src/components/NavigationDrawer';

    export let isExpanded;
    export let menu;
    export let isDrawer;
    export let navPanel;
</script>
<style>
    .header {
        display: flex;
        flex-direction: row;
        align-items: baseline;
        justify-content: space-between;
        padding: 4px;
    }

    :global(.nav-menu-item) {
        border-radius: 0 32px 32px 0;
        width: 246px;
    }

    :global(.nav-menu-item i) {
        font-size: 20px;
    }

    :global(.header button) {
        padding: 12px;
    }

    :global(.header i) {
        color: #cb2328;
        font-size: 32px;
    }
</style>
<nav role="navigation" class="nav-menu">
    <NavigationDrawer
        bind:show={isExpanded}
        persistent={!isDrawer}
        elevation={isDrawer}
        borderClasses="">
        <div class="header">
            <h6 class="p-3 ml-1 text-m text-gray-900">
                Wallet
            </h6>
            {#if isDrawer}
                <Button
                    on:click={() => isExpanded = !isExpanded}
                    color="primary"
                    icon="close" text light flat />
            {/if}
        </div>
        <List items={menu}>
            <span slot="item" let:item={item} class="cursor-pointer">
                <ListItem
                    on:click={() => navPanel = item.id}
                    class="nav-menu-item"
                    text={item.text}
                    icon={item.icon}
                    selected={navPanel === item.id}
                    dense/>
            </span>
        </List>
    </NavigationDrawer>
</nav>