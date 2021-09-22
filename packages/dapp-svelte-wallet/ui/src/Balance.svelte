<script>
    import Purse from './Purse.svelte';
    import {icons, defaultIcon } from './Icons.js';
    
    export let item;
</script>
 
<style>
    .balance {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
    }

    .balance > img {
        margin-right: 16px;
    }
</style>

<div class="balance">
    <img alt="icon"
        src={icons[item.brandPetname] ?? defaultIcon}
        height="32px"
        width="32px" />
    <div>
        <Purse {item}
            details={false}
            summaryLine={1} />
        <Purse {item}
            details={false}
            summaryLine={2} />
    </div>
</div>