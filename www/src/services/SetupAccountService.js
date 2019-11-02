import Axios from "axios"

export default {
    getAuthUrl() {
        return Axios.get('http://127.0.0.1:8000/api/performOauth')
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
            });
    },
    setAuthCode(code) {
        return Axios.get('http://127.0.0.1:8000/api/performOauth?code=' + code)
            .then(function (response) {
                return response.data;
            })
            .catch(function (error) {
                console.log(error);
            });
    }
}
