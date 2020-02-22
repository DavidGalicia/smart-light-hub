let express = require('express');
let http = require('http');
let httpsFR = require('follow-redirects').https;
let cors = require('cors');
let url = require('url');
let WebSocket = require('ws');
let dgram = require("dgram");
let ipTools = require('ip');
let os = require( 'os' );
let {PythonShell} = require('python-shell');
let AudioAnalyser = require("audio-analyser");
let AnalyserWindowFunc = require('window-function/rectangular');
const BufferQueue = require('buffer-queue');
let pcmQueue = new BufferQueue();
let db = require('./db');
const fs = require('fs');
const { Worker } = require('worker_threads');
const lame = require('lame');

const lightMessageWorker = new Worker('./LightMessageWorker.js');
lightMessageWorker.on('message', sendLightMessage);

/** @type {Worker} */
let mp3DecoderWorker = null

let decoder = null;

let savedFormat = null;

let sendTask = null;
function send() {
    let chunk = pcmQueue.shift(savedFormat.sampleRate * savedFormat.channels * savedFormat.bitDepth / 8);
    analyser.write(chunk);
}

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
const LightFps = 5; // frames per second
let DefaultSongChunkSize = 1400;
let SongChunkSize = DefaultSongChunkSize;
let isDrawProcessed = false;

let analyserFftSize = 256;
let analyserFrequencyBinCount = analyserFftSize / 2;
let analyser = new AudioAnalyser({
    // Magnitude diapason, in dB
    minDecibels: -90,
    maxDecibels: -10,

    // Number of time samples to transform to frequency
    fftSize: analyserFftSize,

    // Number of frequencies, twice less than fftSize
    frequencyBinCount: analyserFrequencyBinCount,

    // Smoothing, or the priority of the old data over the new data
    smoothingTimeConstant: 0.2,

    // Number of channel to analyse
    channel: 0,

    // Size of time data to buffer
    bufferSize: 44100,

    // Windowing function for fft, https://github.com/scijs/window-functions
    applyWindow: function (sampleNumber, totalSamples) {
        return AnalyserWindowFunc(sampleNumber, totalSamples)
    }
});



let rgbColorState = {
    color: [255, 0, 0], // start off with red
    decColorComponent: 0,
    incColorComponent: 1,
};

function updateRgbColorState(state) {
    if (state.color[state.incColorComponent] < 255) {
        state.color[state.incColorComponent] += 1;
        state.color[state.decColorComponent] -= 1;
    } else {
        state.decColorComponent = (state.decColorComponent < 2) ? state.decColorComponent + 1 : 0;
        state.incColorComponent = (state.incColorComponent < 2) ? state.incColorComponent + 1 : 0;
    }
}

function draw() {
    if (isDrawProcessed && analyser) {
        let frequencyData = new Uint8Array(analyserFrequencyBinCount);
        analyser.getByteFrequencyData(frequencyData);

        updateRgbColorState(rgbColorState);
        const numLedLightsPerStrip = 144;

        lightMessageWorker.postMessage({
            rgbColorState: rgbColorState,
            numLedLightsPerStrip: numLedLightsPerStrip,
            frequencyData: frequencyData,
            analyserFrequencyBinCount: analyserFrequencyBinCount
        })
    }
}

function sendLightMessage(messageJson) {
    wss.clients.forEach(function(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(messageJson);
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

        });

        songBufferBytesSent += chunk.length;
    }

    if (isStreamDownloaded && (bytesQueued === 0)) {
        if (decoder) {
            decoder.end();
        }

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
        SongChunkSize = DefaultSongChunkSize;
        songBuffer = Buffer.alloc(defaultSongBufferSize);
        songBufferBytesSent = 0;
        streamLength = 0;
        isStreamDownloaded = false;
        isDrawProcessed = true;
        sendSoundChunkResizedEvent();

        if (decoder) {
            decoder.end();
            clearInterval(sendTask);
        }

        decoder = new lame.Decoder();

        decoder.on('format', function(format) {
            savedFormat = format;
            console.log(format);

            decoder.on("data", function(data) {
                pcmQueue.push(data);
            });

            sendTask = setInterval(send, 1000);
        });


        // if (mp3DecoderWorker) {
        //     mp3DecoderWorker.unref();
        // }
        //
        // mp3DecoderWorker = new Worker('./MP3DecoderWorker.js');
        // mp3DecoderWorker.on("message", function(chunk) {
        //     console.log("chunk size: " + chunk.length);
        //     analyser.write(chunk);
        // });
        // mp3DecoderWorker.on("error", function(error) {
        //     console.error(error);
        // });


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
    let udpMessageBuffer = Buffer.from(JSON.stringify(udpMessage));
    let udpClient = dgram.createSocket("udp4");

    udpClient.on('message', function(message, sender) {
        udpClient.close();
    });

    udpClient.on('listening', function() {
        udpClient.setBroadcast(true);
        udpClient.send(udpMessageBuffer, 0, udpMessageBuffer.length, UdpBroadcastPort  , networkBroadcastAddress);
    });

    udpClient.bind(UdpBroadcastPort);

    res.send({'resource': null, 'status': 'good', 'statusDetails': 'The config has been broadcasted.'})
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

    res.send({resource: null, status: 'good', statusDetails: 'Stopping song.'});
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
            res.send(result);
        });
});

app.use(express.static('www/dist'));

server.listen(HttpPort, function() {
    console.log('Listening on *:' + HttpPort);
});

let wss = new WebSocket.Server({'server': server});

wss.on('connection', function connection(ws, request) {
    const urlParts = url.parse(request.url, true);
    const ip = request.connection.remoteAddress;

    ws.on('message', function incoming(messageJson) {
        //console.log('[ws] received: %s', messageJson);

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

            //console.log('soundThrottle has set SongChunkSize to ' + SongChunkSize + ' for ' + NumWebSocketClients + ' node(s)');
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