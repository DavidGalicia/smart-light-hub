import SetupAccount from './components/SetupAccount'
import Devices from './components/Devices'
import Device from './components/Device'
import Nodes from './components/Nodes'

const routes = [
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
    }
];

export default routes;