let express = require('express');
let http = require('http');
let httpsFR = require('follow-redirects').https;
let cors = require('cors');
let url = require('url');
let querystring = require("querystring");
let lame = require('lame');
//let Speaker = require('speaker');
let WebSocket = require('ws');
let StatefulProcessCommandProxy = require('stateful-process-command-proxy');
let dgram = require("dgram");
let ipTools = require('ip');
let os = require( 'os' );

const HttpPort = 8000;
const UdpBroadcastPort = 8001;

let PythonShellOptions = {
    mode: 'text',
    pythonPath: 'python',
    args: []
};

let commandProxy = new StatefulProcessCommandProxy(
    {
        name: "media-server-shell",
        max: 2,
        min: 1,
        idleTimeoutMS: 30000,

        logFunction: function(severity,origin,msg) {
            console.log(severity.toUpperCase() + " " +origin+" "+ msg);
        },

        processCommand: (os.platform() === 'linux') ? '/bin/bash' : 'cmd.exe',
        processArgs:  ['-s'], // read commands from standard input
        processRetainMaxCmdHistory : 10,

        /*processInvalidateOnRegex :
            {
                'any':[{regex:'.*error.*',flags:'ig'}],
                'stdout':[{regex:'.*error.*',flags:'ig'}],
                'stderr':[{regex:'.*error.*',flags:'ig'}]
            },*/

        processCwd : './',

        //initCommands: [ 'testInitVar=test' ],

        /*validateFunction: function(processProxy) {
            return processProxy.isValid();
        },*/

        preDestroyCommands: [ 'echo This ProcessProxy is being destroyed!' ]
    });

function toBase64(str)
{
    return Buffer.from(str).toString('base64')
}

let decoder = null;
let decoderBytesProcessed = 0;
let playSongHttpsRequest = null;
/*const speaker = new Speaker({
    channels: 2,          // 2 channels
    bitDepth: 16,         // 16-bit samples
    sampleRate: 44100     // 44,100 Hz sample rate
});*/

let app = express();

app.use(cors());

let server = http.createServer(app);

app.get(['/', '/#/*'], function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/api/getRegisteredDevices', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];

    commandProxy.executeCommand(PythonShellOptions.pythonPath + ' scripts/getRegisteredDevices.py ' + args.join(' '))
        .then(function(cmdResult) {
            res.end(cmdResult.stdout)
        }).catch(function(error) {
        console.log("Error: " + error);
    });
});

app.get('/api/getRegisteredDevice', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];

    commandProxy.executeCommand(PythonShellOptions.pythonPath + ' scripts/getRegisteredDevice.py ' + args.join(' '))
        .then(function(cmdResult) {
            if (!cmdResult.stderr.includes("GmusicapiWarning"))
                throw cmdResult.stderr;

            res.end(cmdResult.stdout)
        }).catch(function(error) {
            console.log(error);
        });
});

app.get('/api/getAllSongs', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];

    commandProxy.executeCommand(PythonShellOptions.pythonPath + ' scripts/getAllSongs.py ' + args.join(' '))
        .then(function(cmdResult) {
            res.end(cmdResult.stdout)
        }).catch(function(error) {
            console.log("Error: " + error);
        });
});

app.get('/api/getStreamUrl', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];

    commandProxy.executeCommand(PythonShellOptions.pythonPath + ' scripts/getStreamUrl.py ' + args.join(' '))
        .then(function(cmdResult) {
            res.end(cmdResult.stdout)
        }).catch(function(error) {
        console.log("Error: " + error);
    });
});

app.get('/api/playSong', function(req, res) {
    let q = req.query;
    let args = [toBase64(JSON.stringify(q)), 'base64'];

    let playSong = function(streamUrl) {
        console.log(streamUrl);

        if (decoder) {
            decoder.unpipe();
        }

        let onDecoderReady = function() {
            //decoder.pipe(speaker);

            let writeChunk = function(chunk) {
                console.log(chunk);
                decoderBytesProcessed += chunk.length;
            };

            decoder.on('data', writeChunk);

            decoder.on('end', () => {
                console.log(decoderBytesProcessed);
            });
        };

        decoder = new lame.Decoder();
        decoder.on('format', onDecoderReady);

        if (playSongHttpsRequest) {
            playSongHttpsRequest.abort();
        }

        playSongHttpsRequest = httpsFR.get(streamUrl, (response) => {
            response.on('data', (chunk) => {
                decoder.write(chunk);
            });
            response.on('end', () => {
                decoder.end();
            });
        });

        playSongHttpsRequest.on("error", (err) => {
            console.log("Error: " + err.message);
        });
    };

    commandProxy.executeCommand(PythonShellOptions.pythonPath + ' scripts/getStreamUrl.py ' + args.join(' '))
        .then(function(cmdResult) {
            let outputJson = cmdResult.stdout;
            res.end(outputJson);

            let output = JSON.parse(outputJson);

            return output.data; // stream url
        })
        .then(playSong)
        .catch(function(error) {
        console.log("Error: " + error);
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

server.listen(HttpPort, function() {
    console.log('Listening on *:' + HttpPort);
});

let wss = new WebSocket.Server({'server': server});

wss.on('connection', function connection(ws, request) {
   const urlParts = url.parse(request.url, true);
   const ip = request.connection.remoteAddress;

   ws.on('message', function incoming(message) {
       console.log('received: %s', message);
   });

   ws.send('hello client!');
});
