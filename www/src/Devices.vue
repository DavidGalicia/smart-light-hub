<template>
    <div>
        <router-link to="/setupAccount">Don't see your device? Click here</router-link>
        <br>
        <br>

        <h2>Your devices</h2>
        <b-table striped hover :fields="devicesFields" :items="devices" @row-clicked="onDeviceClicked">
            <template slot="kind" slot-scope="data">{{ data.value }}</template>
            <template slot="id" slot-scope="data">{{ data.value }}</template>
            <template slot="friendlyName" slot-scope="data">{{ data.value }}</template>
            <template slot="type" slot-scope="data">{{ data.value }}</template>
            <template slot="action" slot-scope="data"><router-link :to="`devices/${data.item.id}`">Use</router-link></template>
        </b-table>
        <pulse-loader :loading="isDevicesLoading" color="#3AB982" size="30px"></pulse-loader>
    </div>
</template>

<script>
    import DeviceService from "./services/DeviceService"
    import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

    export default {
        name: "Devices",
        methods: {
            get() {
                this.isDevicesLoading = true;

                DeviceService.getAll()
                    .then((data) => {
                        this.isDevicesLoading = false;
                        this.devices = data.resource
                    });
            },
            onDeviceClicked(device) {
                this.$router.push('devices/' + device.id)
            }
        },
        data() {
            return {
                devicesFields: ['kind','id','friendlyName','type'],
                devices: [],
                isDevicesLoading: false
            }
        },
        created() {
            this.get();
        },
        components: {
            DeviceService,
            PulseLoader
        }
    }
</script>

<style scoped>

</style>