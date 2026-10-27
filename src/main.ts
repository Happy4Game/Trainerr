import { IonicVue } from '@ionic/vue';
import { createApp } from 'vue';
import App from './App.vue';
import { i18n } from './i18n';
import { router } from './router';
import { applyStoredTheme } from './ui/theme';

import '@ionic/vue/css/core.css';
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/palettes/dark.class.css';
import './theme/variables.css';

applyStoredTheme();

const app = createApp(App).use(IonicVue).use(router).use(i18n);

router.isReady().then(() => app.mount('#app'));
