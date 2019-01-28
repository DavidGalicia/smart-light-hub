<template>
    
</template>

<script>
    import Axios from "axios"

    export default {
        name: "NodeService",
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
</script>

<style scoped>

</style>