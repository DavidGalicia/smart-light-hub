import Axios from "axios"

export default {
    get(deviceId) {
        return Axios.get('http://127.0.0.1:8000/api/getAllSongs?deviceId=' + deviceId)
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
            });
    },
    play(deviceId, songId) {
        return Axios.get('http://127.0.0.1:8000/api/playSong?deviceId=' + deviceId + '&songId=' + songId)
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.error(error);
            });
    },
    stop() {
        return Axios.get('http://127.0.0.1:8000/api/stopSong')
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.error(error);
            });
    }
}
