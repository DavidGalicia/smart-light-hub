<template>
    <div>
        <router-link to="/">Back to Devices</router-link>
        <br>
        <br>

        <h2>Your {{ device.friendlyName }}</h2>
        <h3>Songs</h3>
        <b-alert variant="danger" :show="playSongResult.status === 'bad'">{{ playSongResult.statusDetails }}</b-alert>

        <b-table striped hover :fields="songsFields" :items="songs" @row-clicked="onSongClicked">
            <template slot="album" slot-scope="data">{{ data.value }}</template>
            <template slot="title" slot-scope="data">{{ data.value }}</template>
            <template slot="artist" slot-scope="data">{{ data.value }}</template>
            <template slot="action" slot-scope="data">
                <b-button size="sm" class="mr-2">
                    {{ data.item.isPlaying ? 'Stop' : 'Play' }}
                </b-button>
            </template>
        </b-table>
        <pulse-loader :loading="isSongsLoading" color="#3AB982" size="30px"></pulse-loader>
    </div>
</template>

<script>
    import DeviceService from './services/DeviceService'
    import SongService from './services/SongService'
    import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

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
                this.isSongsLoading = true;

                SongService.get(deviceId)
                    .then((data) => {
                        this.isSongsLoading = false;

                        let songs = data.resource;

                        for (let i = 0; i < songs.length; i++) {
                            songs[i].isPlaying = false;
                        }

                        this.songs = songs;
                    });
            },
            onSongClicked(song) {
                for (let i = 0; i < this.songs.length; i++) {
                    if (this.songs[i].id !== song.id) {
                        this.songs[i].isPlaying = false;
                    }
                }

                if (song.isPlaying) {
                    song.isPlaying = false;
                    SongService.stop();
                } else {
                    song.isPlaying = true;
                    SongService.play(this.device.id, song.id)
                        .then((data) => {
                            this.playSongResult = data
                        });
                }
            }
        },
        data() {
            return {
                device: { friendlyName: ''},
                songs: [],
                songsFields: ['album', 'title', 'artist','action'],
                isSongsLoading: false,
                playSongResult: {}
            }
        },
        created() {
            this.getDevice(this.$route.params.id);
            this.getSongs(this.$route.params.id);
        },
        components: {
            SongService,
            PulseLoader
        }
    }
</script>

<style scoped>

</style>