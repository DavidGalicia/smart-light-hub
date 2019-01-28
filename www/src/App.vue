<template>
  <div id="app" style="margin-bottom:4em">
    <router-link to="/">Home</router-link> • <router-link to="/nodes">Nodes</router-link><br>
    <img src="./assets/logo.png">
    <h1>{{ msg }}</h1>
    <router-view></router-view>
  </div>
</template>

<script>
  import Devices from "./Devices"

  export default {
    name: 'app',
    // https://vuejs.org/v2/guide/components-registration.html
    components: {
      Devices
    },
    data () {
      return {
        msg: 'Welcome to Your Vue.js App'
      }
    }
  }
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

h1, h2 {
  font-weight: normal;
}

ul {
  list-style-type: none;
  padding: 0;
}

li {
  display: inline-block;
  margin: 0 10px;
}

a {
  color: #42b983;
}
</style>
