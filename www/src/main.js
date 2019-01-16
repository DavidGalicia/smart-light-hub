import Vue from 'vue'
import BootstrapVue from "bootstrap-vue"
import Axios from "axios"
import App from './App.vue'
import router from './router'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-vue/dist/bootstrap-vue.css"

Vue.prototype.$http = Axios;

Vue.use(BootstrapVue);

new Vue({
  el: '#app',
  router,
  render: h => h(App)
});
