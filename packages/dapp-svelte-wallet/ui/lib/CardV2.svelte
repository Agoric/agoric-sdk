<script>
    export let classes = '';
</script>
<style>
    .card {
        display: flex;
        justify-content: flex-start;
        flex-direction: column;
        padding: 16px 0 16px;;
        border-radius: 8px;
        border-color: #e0e0e0;
        border-width: 1px;
        box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2);
    }

    .header {
        margin: 0 16px 16px 16px;
    }
</style>

<div class={`card ${classes}`}>
    <span class="header">
        <slot name="header" />
    </span>
    <slot></slot>
</div>