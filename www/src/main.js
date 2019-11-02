import Vue from 'vue'
import Router from 'vue-router'
import BootstrapVue from 'bootstrap-vue'
import App from './App'
import Routes from './Routes'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-vue/dist/bootstrap-vue.css"

Vue.config.productionTip = false;

const router = new Router({
  routes: Routes
});

Vue.use(Router);
Vue.use(BootstrapVue);

new Vue({
  render: h => h(App),
  router: router
}).$mount('#app');