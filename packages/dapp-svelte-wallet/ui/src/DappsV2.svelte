<script>
    import ListCard from "../lib/ListCard.svelte";
    import Dapp from "./Dapp.svelte";

    import { dapps } from './store';

    export let expandDefault = true;
</script>

<h1>Dapps</h1>
<ListCard items={$dapps} storeKey="dapps-{expandDefault}" {expandDefault}>
    <div slot="empty">
        No Dapps.
    </div>

    <div slot="item-header" let:item>
        <Dapp {item} details={false}/>
    </div>

    <div slot="item-details" let:item>
        <Dapp {item} summary={false}/>
    </div>
</ListCard>