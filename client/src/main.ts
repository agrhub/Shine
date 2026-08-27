import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import ElementPlus from 'element-plus';
import { createPinia } from 'pinia';
import { createApp } from 'vue';

import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';

import App from './App.vue';
import i18n from './i18n';
import router from './router';
import './style.css';
import 'flag-icons/css/flag-icons.min.css';
import { Toaster } from 'vue-sonner';
import 'vue-color/style.css'
import 'vue-sonner/style.css'

const app = createApp(App);

// Register Element Plus icons globally
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

import VueApexCharts from 'vue3-apexcharts';

app.use(createPinia());
app.use(router);
app.use(i18n);
app.component('Toaster', Toaster);
app.use(ElementPlus);
app.use(VueApexCharts);

app.mount('#app');

