
<script>
    import CardV2 from '../lib/CardV2.svelte';

    export let classes = '';
</script>

<style>
    .splash-image {
        opacity: 0.6;
    }

    .content {
        align-items: center;
        display: flex;
        flex-direction: column;
    }

    h6 {
        font-size: 18px;
    }
</style>
 
<CardV2 classes={classes}>
    <h6 slot="header">Requests</h6>
    <div class="content">
        <img class="splash-image"
            src="generic-agoric.svg"
            alt="Empty Inbox"
            width="320"
            height="320" />
        <p class="text-gray-700">
            No requests.
        </p>
    </div>
</CardV2>