<template>
    <div>
        <br>
        <b-alert variant="success" :show="scanStatus === 2">The list has been refreshed.</b-alert>
        <pulse-loader :loading="scanStatus === 1" color="#3AB982" size="30px"></pulse-loader>
        <input type="button" value="Discover New Nodes" v-on:click="scanNetwork()" v-show="scanStatus !== 1">
        <br>
        <br>

        <h2>Nodes</h2>
        <br>

        <b-table striped hover :fields="nodesFields" :items="nodes">
            <template slot="macAddress" slot-scope="data">{{ data.value }}</template>
            <template slot="ip" slot-scope="data">{{ data.value }}</template>
            <template slot="role" slot-scope="data">{{ data.value }}</template>
            <template slot="connectedAt" slot-scope="data">{{ data.value }}</template>
        </b-table>
        <pulse-loader :loading="isNodesLoading" color="#3AB982" size="30px"></pulse-loader>
    </div>
</template>

<script>
    import NodeService from "./services/NodeService"
    import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

    export default {
        name: "Nodes",
        methods: {
            get() {
                this.isNodesLoading = true;

                NodeService.getAll()
                    .then((data) => {
                        this.isNodesLoading = false;
                        this.nodes = data.resource
                    });
            },
            scanNetwork() {
                this.scanStatus = 1;
                NodeService.broadcastConfig();
                let self = this;

                setTimeout(function() {
                    self.scanStatus = 2;
                    self.get();
                }, 3000);
            }
        },
        data() {
            return {
                nodesFields: ['macAddress','ip','role','connectedAt'],
                nodes: [],
                scanStatus: 0, // 0: not scanned, 1: scanning, 2: scanned
                isNodesLoading: false
            }
        },
        created() {
            this.get();
            NodeService.broadcastConfig();
        },
        components: {
            NodeService,
            PulseLoader
        }
    }
</script>

<style scoped>

</style>