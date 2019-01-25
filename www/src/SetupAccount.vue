<template>
    <div>
        <h2>Your devices</h2>
        <b-table striped hover :fields="devicesFields" :items="devices" @row-clicked="onDeviceClicked">
            <template slot="kind" slot-scope="data">{{ data.value }}</template>
            <template slot="id" slot-scope="data">{{ data.value }}</template>
            <template slot="friendlyName" slot-scope="data">{{ data.value }}</template>
            <template slot="type" slot-scope="data">{{ data.value }}</template>
            <template slot="action" slot-scope="data"><router-link :to="`devices/${data.item.id}`">Use</router-link></template>
        </b-table>
    </div>
</template>

<script>
    import SetupAccountService from "./services/SetupAccountService";

    export default {
        name: "SetupAccount",
        methods: {
            get() {
                DeviceService.getAll()
                    .then((data) => {
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
                devices: []
            }
        },
        created() {
            this.get();
        },
        components: {
            DeviceService
        }
    }
</script>

<style scoped>

</style>