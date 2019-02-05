let express = require('express');
let http = require('http');
let httpsFR = require('follow-redirects').https;
let cors = require('cors');
let url = require('url');
let querystring = require("querystring");
let lame = require('lame');
let WebSocket = require('ws');
let dgram = require("dgram");
let ipTools = require('ip');
let os = require( 'os' );
let BufferQueue = require('buffer-queue');
let {PythonShell} = require('python-shell');
let Analyser = require("audio-analyser");
let AnalyserWindowFunc = require('window-function/rectangular');
let db = require('./db');
let normalColorBlend = require('color-blend').normal;

function toBase64(str) {
    return Buffer.from(str).toString('base64')
}

const HttpPort = 8000;
const UdpBroadcastPort = 8001;

let NumWebSocketClients = 0; // the number of clients currently connected
let throttleBurstFifo = new BufferQueue();
let isStreamDownloaded = false;
let playSongHttpsRequest = null;
let decoder = null;
const LightFps = 1; // frames per second

let isDrawProcessed = false;
let analyser = null;
let analyserFftSize = 256;
let analyserFrequencyBinCount = analyserFftSize / 2;
let rgbColor = [255,0,0]; // start off with red
let decColor = 0;
let incColor = decColor + 1;
let colorValue = 0;
let SongChunkSize = 1400;

// adapted from:
// https://gist.github.com/jamesotron/766994#file-rgb_spectrum-c-L22
function updateRgbColor() {
    if (decColor < 3) {
        if (colorValue < 255) {
            rgbColor[decColor] -= 1;
            rgbColor[incColor] += 1;
            colorValue++;
        } else {
            colorValue = 0;
            decColor += 1;
            incColor = decColor === 2 ? 0 : decColor + 1;
        }
    } else {
        decColor = 0;
    }
}

function draw() {
    if (!isDrawProcessed) {
        return;
    }
    if (!analyser) {
        return;
    }

    let frequencyData = new Uint8Array(analyserFrequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    updateRgbColor();
    const numLedLightsPerStrip = 144;
    const whiteBackground  = { r: 255, g: 255, b: 255, a: 1.0 };

    let message1 = {
        'type': 'light',
        'lights': [],
        'numLights': 0
    };
    let message2 = {
        'type': 'light',
        'lights': [],
        'numLights': 0
    };

    // we can't update all the lights by id yet because of poor song streaming
    let minId = Math.round(colorValue/255 * numLedLightsPerStrip);
    let maxId = Math.round(((colorValue+1)/255) * numLedLightsPerStrip);

    for (let i = 0; i < numLedLightsPerStrip; i++) {
        let bin = Math.round(i * analyserFrequencyBinCount / numLedLightsPerStrip);
        let alpha = frequencyData[bin] / 255;
        let colorForeground = {r: rgbColor[0], g: rgbColor[1], b: rgbColor[2], a: alpha};
        let color = normalColorBlend(whiteBackground, colorForeground);

        //if ((i >= minId) && (i <= maxId))
        if (i < (numLedLightsPerStrip/2))
            message1.lights.push({
                'id': i,
                'r': color.r,
                'g': color.g,
                'b': color.b
            });
        else
            message2.lights.push({
                'id': i,
                'r': color.r,
                'g': color.g,
                'b': color.b
            });
    }

    message1.numLights = message1.lights.length;
    message2.numLights = message2.lights.length;

    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message1));
            client.send(JSON.stringify(message2));
        }
    });
}

setInterval(draw, 1000/LightFps);

function drainSongBuffer() {
    if (throttleBurstFifo.length()) {
        let chunk = null;

        if (throttleBurstFifo.length() > SongChunkSize)
            chunk = throttleBurstFifo.shift(SongChunkSize);
        else
            chunk = throttleBurstFifo.drain();

        NumWebSocketClients = 0;
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN)
                client.send(chunk);
                NumWebSocketClients++;
        });
    }

    if (isStreamDownloaded && (!throttleBurstFifo.length())) {
        decoder.end();
        isDrawProcessed = false;
    }
}

throttleBurstFifoTask = setInterval(drainSongBuffer, 150);

const PythonShellOptions = {
    mode: 'text',
    pythonPath: (os.platform() === 'linux') ? 'python' : 'python.exe',
    scriptPath: './scripts',
};

let app = express();

app.use(cors());

let server = http.createServer(app);

app.get('/api/performOauth', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = 'performOauth.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        if (error)
            console.log("Error: " + error);

        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);
    });
});

app.get('/api/checkOauthCredFile', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = 'checkOauthCredFile.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        if (error)
            console.log("Error: " + error);
    });
});

app.get('/api/getRegisteredDevices', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = "getRegisteredDevices.py";

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        if (error)
            console.log("Error: " + error);
    });
});

app.get('/api/getRegisteredDevice', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = 'getRegisteredDevice.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        if (error)
            console.log("Error: " + error);
    });
});

app.get('/api/getAllSongs', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = 'getAllSongs.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        if (error)
            console.log("Error: " + error);
    });
});

app.get('/api/getStreamUrl', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    let command = 'getStreamUrl.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        if (error)
            console.log("Error: " + error);
    });
});

app.get('/api/playSong', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            let message = {'type': 'sound','action':'stop'};
            client.send(JSON.stringify(message));
        }
    });

    let playSong = function(streamUrl) {
        if (decoder) {
            decoder.end();
        }
        throttleBurstFifo.empty();
        isStreamDownloaded = false;
        isDrawProcessed = false;
        sendSoundChunkResizedEvent();

        decoder = new lame.Decoder();

        decoder.on('format', function(format) {
            isDrawProcessed = true;

            let samplesPerLightFrame = Math.floor(format.sampleRate / LightFps);

            analyser = new Analyser({
                // Magnitude diapasone, in dB
                minDecibels: -100,
                maxDecibels: -30,

                // Number of time samples to transform to frequency
                fftSize: analyserFftSize,

                // Number of frequencies, twice less than fftSize
                frequencyBinCount: analyserFrequencyBinCount,

                // Smoothing, or the priority of the old data over the new data
                smoothingTimeConstant: 0.2,

                // Number of channel to analyse
                channel: 0,

                // Size of time data to buffer
                bufferSize: samplesPerLightFrame,

                // Windowing function for fft, https://github.com/scijs/window-functions
                applyWindow: function (sampleNumber, totalSamples) {
                    return AnalyserWindowFunc(sampleNumber, totalSamples)
                }
            });

            decoder.pipe(analyser);
        });

        decoder.on('error', () => { }); // do nothing
        decoder.on('end', () => { }); // do nothing

        if (playSongHttpsRequest) {
            playSongHttpsRequest.abort();
        }

        playSongHttpsRequest = httpsFR.get(streamUrl, (response) => {
            response.on('data', (chunk) => {
                decoder.write(chunk);
                throttleBurstFifo.push(chunk);
            });
            response.on('end', () => {
                isStreamDownloaded = true;
            });
            response.on('error', () => {
                isStreamDownloaded = true;
                decoder.end();
            })
        });

        playSongHttpsRequest.on("error", (err) => {
            console.log("Error: " + err.message);
        });
    };

    let command = 'getStreamUrl.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        let output = JSON.parse(joinedCmdResults);

        console.log(output);

        if (error)
            console.log("Error: " + error);
        else
            playSong(output.resource);
    });
});

app.get('/api/broadcastConfig', function(req,res) {
    let networkInterfaces = os.networkInterfaces( );
    let networkBroadcastAddress = "";
    let websocketServerIP = "";

    // our websocket server may have multiple IPs so we
    // need to guess the best one we'll share with the nodes
    for (let name in networkInterfaces) {
        if (name !== 'lo') {
            let networkInterface = networkInterfaces[name];

            for (let i = 0; i < networkInterface.length; i++) {
                let ipInfo = networkInterface[i];
                if ((ipInfo.address !== '127.0.0.1') && (ipInfo.family === 'IPv4')) {
                    let subnetInfo = ipTools.subnet(ipInfo.address, ipInfo.netmask);
                    networkBroadcastAddress = subnetInfo.broadcastAddress;
                    websocketServerIP = ipInfo.address
                }
            }
        }
    }

    let udpMessage = {
        ip: websocketServerIP,
        port: HttpPort,
        message: "Please setup a websocket connection to the hub."
    };
    let udpMessageBuffer = new Buffer(JSON.stringify(udpMessage));
    let udpClient = dgram.createSocket("udp4");

    udpClient.on('message', function(message, sender) {
        udpClient.close();
    });

    udpClient.on('listening', function() {
        udpClient.setBroadcast(true);
        udpClient.send(udpMessageBuffer, 0, udpMessageBuffer.length, UdpBroadcastPort  , networkBroadcastAddress);
    });

    udpClient.bind(UdpBroadcastPort);

    res.end(JSON.stringify({'resource': null, 'status': 'good', 'statusDetails': 'The config has been broadcasted.'}))
});

app.get('/api/stopSong', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];
    let options = {
        mode: 'text',
        pythonPath: PythonShellOptions.pythonPath,
        scriptPath: PythonShellOptions.scriptPath,
        args: args
    };

    if (playSongHttpsRequest) {
        playSongHttpsRequest.abort();
    }

    isDrawProcessed = false;
    throttleBurstFifo.empty();

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            let message = {'type': 'sound', 'action': 'stop'};
            client.send(JSON.stringify(message));
        }
    });
});

app.get('/api/getNodes', function(req,res) {
    let result = {
        resource: null,
        status: 'good',
        statusDetails: ''
    };

    db.getNodes()
        .then(function(rows){
            result.resource = rows;
            res.end(JSON.stringify(result));
        })
        .catch(function(error) {
            result.status = 'bad';
            result.statusDetails = 'Failed to get nodes. Details: ' + error;
            res.end(JSON.stringify(result));
        });
});

app.use(express.static('www'));

server.listen(HttpPort, function() {
    console.log('Listening on *:' + HttpPort);
});

let wss = new WebSocket.Server({'server': server});

wss.on('connection', function connection(ws, request) {
    const urlParts = url.parse(request.url, true);
    const ip = request.connection.remoteAddress;

    ws.on('message', function incoming(messageJson) {
        console.log('[ws] received: %s', messageJson);

        let message = JSON.parse(messageJson);

        if (message.type === 'nodeInfo') {
            message.connectedAt = Math.floor(Date.now()/1000);

            db.getNode({'macAddress': message.macAddress})
                .then(function(row) {
                    if (row) {
                        db.updateNode(message)
                    } else {
                        db.addNode(message);
                    }
                })
        }

        if (message.type === 'sound') {
            const step = 50;

            if (message.action === 'increaseChunkSize') {
                if ((SongChunkSize + step) < message.maxChunkSize) {
                    SongChunkSize += step;
                }
            }
            if (message.action === 'decreaseChunkSize') {
                if (SongChunkSize > step) {
                    SongChunkSize -= step;
                }
            }

            sendSoundChunkResizedEvent();

            console.log('soundThrottle has set SongChunkSize to ' + SongChunkSize + ' for ' + NumWebSocketClients + ' node(s)');
        }
    });

    //ws.send('hello client!');
});

function sendSoundChunkResizedEvent()
{
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            let message = {'type': 'sound','action':'soundChunkResizeRequestServiced'};
            client.send(JSON.stringify(message));
        }
    });
}