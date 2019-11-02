import Axios from "axios"

export default {
    getAll() {
        return Axios.get('http://127.0.0.1:8000/api/getNodes')
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
            });
    },
    broadcastConfig() {
        return Axios.get('http://127.0.0.1:8000/api/broadcastConfig')
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}
