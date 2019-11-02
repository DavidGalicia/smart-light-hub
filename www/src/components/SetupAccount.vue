<template>
    <div>
        <router-link to="/">Back to Devices</router-link>
        <br>
        <br>

        <h2>Link your Google Music account</h2>
        <br>

        <h3>Step 1</h3>
        <p>Click <a target="_blank" :href="authUrl">here</a> to log into Google and follow the prompts.</p>
        <h3>Step 2</h3>

        <b-alert variant="success" :show="setAuthCodeResult.status === 'good'">{{ setAuthCodeResult.statusDetails }}</b-alert>
        <b-alert variant="danger" :show="setAuthCodeResult.status === 'bad'">{{ setAuthCodeResult.statusDetails }}</b-alert>
        <pulse-loader :loading="isSetAuthCodeResultLoading" color="#3AB982" size="30px"></pulse-loader>

        <div v-show="setAuthCodeResult.status !== 'good'">
            <p>Paste the code shown to you at the end of Step 1:</p>
            <input type="text" v-model="code"/>
            <input type="button" value="Submit" v-on:click="setAuthCode(code)" >
        </div>

        <div v-show="setAuthCodeResult.status === 'good'">
            <router-link to="/">Back to Devices</router-link>
        </div>
    </div>
</template>

<script>
    import SetupAccountService from "../services/SetupAccountService";
    import PulseLoader from 'vue-spinner/src/PulseLoader.vue'

    export default {
        name: "SetupAccount",
        methods: {
            getAuthUrl() {
                SetupAccountService.getAuthUrl()
                    .then((data) => {
                        this.authUrl = data.resource
                    });
            },
            setAuthCode(code) {
                this.isSetAuthCodeResultLoading = true;
                SetupAccountService.setAuthCode(code)
                    .then((data) => {
                        this.isSetAuthCodeResultLoading = false;
                        this.setAuthCodeResult = data
                    });
            }
        },
        data() {
            return {
                authUrl: "",
                code: "",
                setAuthCodeResult: {},
                isSetAuthCodeResultLoading: false
            }
        },
        created() {
            this.getAuthUrl();
        },
        components: {
            SetupAccountService,
            PulseLoader
        }
    }
</script>

<style scoped>

</style>