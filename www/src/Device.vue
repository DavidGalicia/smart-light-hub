<template>
    <div>
        <router-link to="/">Back to Devices</router-link>

        <h2>Your {{ device.friendlyName }}</h2>
        <h3>Songs</h3>

        <b-table striped hover :fields="songsFields" :items="songs">
            <template slot="album" slot-scope="data">{{ data.value }}</template>
            <template slot="title" slot-scope="data">{{ data.value }}</template>
            <template slot="artist" slot-scope="data">{{ data.value }}</template>
        </b-table>
    </div>
</template>

<script>
    import DeviceService from './services/DeviceService'
    import SongService from './services/SongService'

    export default {
        name: 'Device',
        methods: {
            getDevice(id) {
                DeviceService.get(id)
                    .then((data) => {
                        this.device = data.resource
                    });
            },
            getSongs(deviceId) {
                SongService.get(deviceId)
                    .then((data) => {
                        this.songs = data.resource
                    });
            }
        },
        data() {
            return {
                device: { friendlyName: ''},
                songs: [],
                songsFields: ['album', 'title', 'artist']
            }
        },
        created() {
            this.getDevice(this.$route.params.id);
            this.getSongs(this.$route.params.id);
        },
        components: {
            SongService
        }
    }
</script>

<style scoped>

</style>