import Vue from 'vue'
import Router from 'vue-router'
import Devices from '../Devices'
import Device from '../Device'

Vue.use(Router);

export default new Router({
    routes: [
        {
            path: '/',
            name: 'Devices',
            component: Devices
        },
        {
            path: '/devices/:id',
            name: 'Device',
            component: Device
        }
    ]
})