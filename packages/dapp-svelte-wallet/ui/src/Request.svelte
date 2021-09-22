<script>
    import Button from 'smelte/src/components/Button';

    export let dismiss;
    export let completed;
</script>

<style>
.container {
    width: 420px;
    max-width: 420px;
    border-radius: 16px;
    padding-bottom: 16px;
    padding-left: 16px;
    padding-right: 16px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
    margin-bottom: 16px;
    animation: expand 0.4s;
    position: relative;
}

.request-summary {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-radius: 16px 16px 0 0;
    width: 100%;
    font-size: 18px;
    font-weight: 500;
    color: rgb(40, 34, 48);
    margin-bottom: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #eeeeee;
}

.overlay {
    position: absolute;
    height: 100%;
    width: 100%;
    border-radius: 16px;
    top: 0;
    left: 0;
    background-color:rgb(40, 34, 48, 0.1);
    animation: fade-in 2.0s;
}

:global(.request-summary button) {
    padding: 4px;
    margin: 0;
    z-index: 1;
}

:global(.request-summary i) {
    font-size: 24px;
}

@keyframes expand {
    0% { 
        transform: scale(0.0);
    }
    100% {
        transform: scale(1.0)
    }
}

@keyframes fade-in {
    0% { 
        opacity: 0;
    }
    100% {
        opacity: 1;
    }
}
</style>
  
<div class="container">
    <div class="request-summary">
        <slot name="header"></slot>
        <Button
            on:click={dismiss}
            color="dark"
            icon="close" text light flat />
    </div>

    <div class="body">
        <slot></slot>
    </div>

    {#if completed}
        <div class="overlay" />
    {/if}
</div>