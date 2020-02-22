const { parentPort } = require('worker_threads');
const lame = require('lame');
const BufferQueue = require('buffer-queue');
const queue = new BufferQueue();

let decoder = new lame.Decoder();

let savedFormat = null;

decoder.on('format', function(format) {
    savedFormat = format;
    console.log(format);

    decoder.on("data", function(data) {
        queue.push(data);
    });

    setInterval(send, 1000);
});

function send() {
    let chunk = queue.shift(savedFormat.sampleRate * savedFormat.channels * savedFormat.bitDepth / 8);
    parentPort.postMessage(chunk);
}

decoder.on('error', (error) => { console.error(error) }); // do nothing
decoder.on('end', () => { }); // do nothing

parentPort.on('message', function(chunk) {
    let buf = Buffer.from(chunk);
    decoder.write(buf);
});

decoder.write([1,2, 3]);