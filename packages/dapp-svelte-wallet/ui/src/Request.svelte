<script>
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
}

.summary {
    border-radius: 16px 16px 0 0;
    width: 100%;
    font-size: 18px;
    font-weight: 500;
    color: rgb(40, 34, 48);
    margin-bottom: 16px;
    padding: 8px 0;
    border-bottom: 1px solid #eeeeee;
}

@keyframes expand {
    0% { 
        transform: scale(0.0);
    }
    100% {
        transform: scale(1.0)
    }
}
</style>
  
<div class="container">
    <div class="summary">
        <slot name="header"></slot>
    </div>

    <div class="body">
        <slot></slot>
    </div>
</div>