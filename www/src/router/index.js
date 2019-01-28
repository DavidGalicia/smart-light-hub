import Vue from 'vue'
import Router from 'vue-router'
import SetupAccount from '../SetupAccount'
import Devices from '../Devices'
import Device from '../Device'
import Nodes from '../Nodes'

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
        },
        {
            path: '/setupAccount',
            name: 'SetupAccount',
            component: SetupAccount
        },
        {
            path: '/nodes',
            name: 'Nodes',
            component: Nodes
        },

    ]
})