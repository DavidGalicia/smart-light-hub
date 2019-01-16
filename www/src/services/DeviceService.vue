<template>
    
</template>

<script>
    import Axios from "axios"

    export default {
        name: "DeviceService",
        get(id) {
            return Axios.get('http://127.0.0.1:8000/api/getRegisteredDevice?id=' + id)
                .then(function (response) {
                    return response.data;
                })
                .catch(function (error) {
                    console.log(error);
                });
        },
        getAll() {
            return Axios.get('http://127.0.0.1:8000/api/getRegisteredDevices')
                .then(function (response) {
                    return response.data;
                })
                .catch(function (error) {
                    console.log(error);
                });
        },

    }
</script>

<style scoped>

</style>