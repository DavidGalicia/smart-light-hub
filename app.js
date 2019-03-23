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
const fs = require('fs');

function toBase64(str) {
    return Buffer.from(str).toString('base64')
}

const HttpPort = 8000;
const UdpBroadcastPort = 8001;

let SongsFolderPath = "./songs";
let NumWebSocketClients = 0; // the number of clients currently connected
let defaultSongBufferSize = 20*1000*1000; // 20 MB buffer
let songBuffer = Buffer.alloc(0);
let songBufferBytesSent = 0; // bytes send to client
let streamLength = 0; // length of stream in bytes
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
let DefaultSongChunkSize = 1400;
let SongChunkSize = DefaultSongChunkSize;

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
    let bytesQueued = streamLength - songBufferBytesSent;

    if (bytesQueued > 0) {
        let chunk = null;

        if (bytesQueued > SongChunkSize)
            chunk = songBuffer.slice(songBufferBytesSent, songBufferBytesSent + SongChunkSize);
        else
            chunk = songBuffer.slice(songBufferBytesSent, songBufferBytesSent + bytesQueued);

        NumWebSocketClients = 0;
        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN)
                client.send(chunk);
                NumWebSocketClients++;
                songBufferBytesSent += chunk.length;
        });
    }

    if (isStreamDownloaded && (bytesQueued === 0)) {
        decoder.end();
        isDrawProcessed = false;
    }
}

throttleBurstFifoTask = setInterval(drainSongBuffer, 110);

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

        if (error)
            console.log("Error: " + error);

        joinedCmdResults = JSON.parse(joinedCmdResults);

        if (joinedCmdResults.resource) {
            for (let i = 0; i < joinedCmdResults.resource.length; i++) {
                let song = joinedCmdResults.resource[i];
                let dbSong = {id: song.id, album: song.album, title: song.title, artist: song.artist};

                db.addSong(dbSong)
                    .catch(function() {
                        db.updateSong(dbSong)
                            .catch(function(error) {
                                console.log("failed to save song info to database: " + error);
                            })
                    });
            }
        }

        let result = {
            resource: null,
            status: 'good',
            statusDetails: ''
        };

        db.getSongs()
            .then(function(rows){
                result.resource = rows;
                res.end(JSON.stringify(result));
            })
            .catch(function(error) {
                result.status = 'bad';
                result.statusDetails = 'Failed to get songs. Details: ' + error;
                res.end(JSON.stringify(result));
            });
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

    let playSong = function(songId, streamUrl) {
        if (decoder) {
            decoder.end();
        }
        SongChunkSize = DefaultSongChunkSize;
        songBuffer = Buffer.alloc(defaultSongBufferSize);
        songBufferBytesSent = 0;
        streamLength = 0;
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

        let songPath = SongsFolderPath + "/" + songId;

        fs.exists(songPath, function(exists) {
            if (exists) {
                // read the song from the hard drive
                console.log("reading song " + songId + " from hard drive ...");

                let readStream = fs.createReadStream(songPath);

                readStream.on('data', (chunk) => {
                    decoder.write(chunk);
                    chunk.copy(songBuffer, streamLength);
                    streamLength += chunk.length;
                });
                readStream.on('end', () => {
                    isStreamDownloaded = true;
                });
                readStream.on('error', () => {
                    isStreamDownloaded = true;
                    decoder.end();
                })
            } else {
                // download the song
                playSongHttpsRequest = httpsFR.get(streamUrl, (response) => {
                    response.on('data', (chunk) => {
                        decoder.write(chunk);
                        chunk.copy(songBuffer, streamLength);
                        streamLength += chunk.length;
                    });
                    response.on('end', () => {
                        isStreamDownloaded = true;

                        // save the song
                        fs.open(songPath, 'w', function(error, fd) {
                            if (error) {
                                throw 'could not open ' + songPath + ': ' + error;
                            }

                            fs.write(fd, songBuffer, 0, streamLength, null, function(err) {
                                if (err) throw 'error writing song ' + songId + ' to hard drive: ' +  err;
                                fs.close(fd, function() {
                                    console.log('wrote song ' + songId + ' to hard drive!');
                                });
                            });
                        });
                    });
                    response.on('error', () => {
                        isStreamDownloaded = true;
                        decoder.end();
                    })
                });

                playSongHttpsRequest.on("error", (err) => {
                    console.log("Error: " + err.message);
                });
            }
        });
    };

    let command = 'getStreamUrl.py';

    PythonShell.run(command, options, function(error, cmdResults) {
        let joinedCmdResults = cmdResults.join('');

        res.end(joinedCmdResults);

        let output = JSON.parse(joinedCmdResults);

        console.log(output);

        if (error) {
            console.log("Error: " + error);
        }

        playSong(q.songId, output.resource);
    });
});

app.get('/api/broadcastConfig', function(req,res) {
    let networkInterfaces = os.networkInterfaces();
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
    songBufferBytesSent = streamLength; // stops drainSongBuffer() from sending more bytes

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            let message = {'type': 'sound', 'action': 'stop'};
            client.send(JSON.stringify(message));
        }
    });

    res.end(JSON.stringify({resource: null, status: 'good', statusDetails: 'Stopping song.'}));
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
            const step = 25;

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

if (!fs.existsSync(SongsFolderPath)){
    fs.mkdirSync(SongsFolderPath);
}