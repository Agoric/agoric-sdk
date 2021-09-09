import './install-ses-lockdown.js';
import './tailwind.css';
import App from './App.svelte';
import AppV2 from './AppV2.svelte';

const urlParams = new URLSearchParams(window.location.search);
const isV2 = urlParams.get('ui') === 'v2';

const app = isV2
  ? new AppV2({
      target: document.body,
      props: {},
    })
  : new App({
      target: document.body,
      props: {},
    });

export default app;
