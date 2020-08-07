<script>
  import { ThemeToggle } from 'svelte-themer';

  import Icon from "smelte/src/components/Icon";
  import Card from "smelte/src/components/Card";

  import { dapps } from './store';
</script>

<style>
  .actions {
    margin: 1em 0 0 2em;
  }
</style>

<div class="fullwidth px-2 py-2">
  <Card.Title title="Config" />

  <div class="actions">
    <ThemeToggle />
  </div>
</div>
