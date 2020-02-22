const { parentPort } = require('worker_threads');
const normalColorBlend = require('color-blend').normal;

const whiteBackground  = { r: 255, g: 255, b: 255, a: 1.0 };

parentPort.on('message', function(data) {
    let message = {
        'type': 'light',
        'lights': [],
        'numLights': 0
    };

    for (let i = 0; i < data.numLedLightsPerStrip; i++) {
        let bin = Math.round(i * data.analyserFrequencyBinCount / data.numLedLightsPerStrip);
        let alpha = 1.0 - data.frequencyData[bin] / 255.0;
        alpha = alpha * (1 + Math.sqrt(1 - alpha));
        if (alpha > 1.0) {
            alpha = 1.0
        }

        //console.log("bin: " + bin + ", val: " + data.frequencyData[bin] + ", alpha: " + alpha);
        let colorForeground = {
            r: data.rgbColorState.color[0],
            g: data.rgbColorState.color[1],
            b: data.rgbColorState.color[2],
            a: alpha};
        let color = normalColorBlend(whiteBackground, colorForeground);

        message.lights.push({
            'id': i,
            'r': color.r,
            'g': color.g,
            'b': color.b
        });
    }

    message.numLights = message.lights.length;

    const json = JSON.stringify(message);

    parentPort.postMessage(json);
});

