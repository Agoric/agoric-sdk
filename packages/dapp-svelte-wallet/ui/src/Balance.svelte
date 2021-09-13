<script>
    import Purse from './Purse.svelte';

    export let item;
    const icons = {
        'RUN': 'tokens/RUN.svg',
        'BLD': 'tokens/BLD.svg',
        'ATOM': 'tokens/cosmos.svg',
        'LINK': 'tokens/chainlink.png',
        'USDC': 'tokens/usdc.svg'
    }
    const defaultIcon = 'tokens/generic.ico'
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
        height="28px"
        width="28px" />
    <div>
        <Purse {item}
            details={false}
            summaryLine={1} />
        <Purse {item}
            details={false}
            summaryLine={2} />
    </div>
</div>