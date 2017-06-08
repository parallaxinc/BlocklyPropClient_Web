//TODO Enhance (or integrate with index.js) to support multiple active connections (portIDs); talkToProp and hearFromProp especially

var portID = -1;

// propComm status values
const stInvalid = -1;
const stValidating = 0;
const stValid = 1;

// propComm stage values
const sgIdle = 0;
const sgHandshake = 1;
const sgVersion = 2;
const sgRAMChecksum = 3;
const sgEEProgram = 4;
const sgEEChecksum = 5;

// Propeller Communication (propComm) status
var propComm = {
    stage     : sgIdle,
    rxCount   : 0,
    handshake : stValidating,
    version   : 0,
    ramCheck  : stValidating,
    eeProg    : stValidating,
    eeCheck   : stValidating
};

const txHandshake = [
    0x49,                                                                            /*First timing template ('1' and '0') plus first two bits of handshake ('0' and '1')*/
    0xAA,0x52,0xA5,0xAA,0x25,0xAA,0xD2,0xCA,0x52,0x25,0xD2,0xD2,0xD2,0xAA,0x49,0x92, /*Remaining 248 bits of handshake...*/
    0xC9,0x2A,0xA5,0x25,0x4A,0x49,0x49,0x2A,0x25,0x49,0xA5,0x4A,0xAA,0x2A,0xA9,0xCA,
    0xAA,0x55,0x52,0xAA,0xA9,0x29,0x92,0x92,0x29,0x25,0x2A,0xAA,0x92,0x92,0x55,0xCA,
    0x4A,0xCA,0xCA,0x92,0xCA,0x92,0x95,0x55,0xA9,0x92,0x2A,0xD2,0x52,0x92,0x52,0xCA,
    0xD2,0xCA,0x2A,0xFF,
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29, /*250 timing templates ('1' and '0')*/
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29, /*to receive 250-bit handshake from */
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29, /*Propeller.}                       */
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29, /*This is encoded as two pairs per} */
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29, /*byte; 125 bytes}                  */
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,
    0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,0x29,
    0x29,0x29,0x29,0x29,                                                             /*8 timing templates ('1' and '0') to receive 8-bit Propeller ver; two pairs per byte; 4 bytes*/
    0x93,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xF2                           /*Download command (1; program RAM and run); 11 bytes*/
];

const rxHandshake = [
    0xEE,0xCE,0xCE,0xCF,0xEF,0xCF,0xEE,0xEF,0xCF,0xCF,0xEF,0xEF,0xCF,0xCE,0xEF,0xCF,  /*The RxHandshake array consists of 125 bytes encoded to represent the expected*/
    0xEE,0xEE,0xCE,0xEE,0xEF,0xCF,0xCE,0xEE,0xCE,0xCF,0xEE,0xEE,0xEF,0xCF,0xEE,0xCE,  /*250-bit (125-byte @ 2 bits/byte) response of continuing-LFSR stream bits from*/
    0xEE,0xCE,0xEE,0xCF,0xEF,0xEE,0xEF,0xCE,0xEE,0xEE,0xCF,0xEE,0xCF,0xEE,0xEE,0xCF,  /*the Propeller, prompted by the timing templates following the txHandshake stream.*/
    0xEF,0xCE,0xCF,0xEE,0xEF,0xEE,0xEE,0xEE,0xEE,0xEF,0xEE,0xCF,0xCF,0xEF,0xEE,0xCE,
    0xEF,0xEF,0xEF,0xEF,0xCE,0xEF,0xEE,0xEF,0xCF,0xEF,0xCF,0xCF,0xCE,0xCE,0xCE,0xCF,
    0xCF,0xEF,0xCE,0xEE,0xCF,0xEE,0xEF,0xCE,0xCE,0xCE,0xEF,0xEF,0xCF,0xCF,0xEE,0xEE,
    0xEE,0xCE,0xCF,0xCE,0xCE,0xCF,0xCE,0xEE,0xEF,0xEE,0xEF,0xEF,0xCF,0xEF,0xCE,0xCE,
    0xEF,0xCE,0xEE,0xCE,0xEF,0xCE,0xCE,0xEE,0xCF,0xCF,0xCE,0xCF,0xCF
];

const microBootLoader = [
    0x9a,0xd2,0x93,0x92,0x92,0x92,0x92,                                              /*Patched and Encoded Micro Boot Loader*/
    0x92,0x92,0x92,0xf2,0x92,0x92,0x92,0x4a,0x29,0xca,0x52,0xd2,0x92,0x52,0xa5,0xc9,
    0x92,0x92,0xc9,0xd2,0x92,0x92,0x92,0x92,0xd2,0x92,0x25,0x92,0x92,0x92,0x49,0xc9,
    0x92,0x92,0x92,0x92,0x25,0x92,0x92,0x4a,0x52,0x92,0x92,0x92,0xaa,0x29,0x92,0x92,
    0xca,0x92,0x92,0x92,0x92,0x92,0x52,0x29,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x4a,
    0x49,0x92,0x4a,0x55,0x95,0xc9,0x92,0xa9,0x2a,0xca,0x52,0xaa,0x55,0x29,0x92,0x4a,
    0xc9,0x4a,0x92,0xaa,0xca,0xaa,0xa9,0x92,0x4a,0xc9,0x92,0x92,0x52,0x29,0xaa,0x95,
    0xd2,0xca,0xca,0x52,0x95,0xaa,0xca,0xaa,0x29,0x92,0x92,0xc9,0x92,0x29,0xa5,0x29,
    0x2a,0x2a,0x92,0x4a,0xc9,0x4a,0x92,0xaa,0xca,0xaa,0x29,0x52,0x95,0x49,0xd5,0x52,
    0xd2,0x52,0x25,0xc9,0x52,0x4a,0x92,0x92,0xa5,0x29,0xaa,0x95,0xca,0xaa,0x49,0x29,
    0xd2,0xd2,0x92,0xaa,0x95,0x4a,0xca,0xca,0x52,0x92,0xa9,0xca,0xaa,0x29,0x92,0x4a,
    0xca,0x92,0x92,0xaa,0x29,0xaa,0x95,0x92,0x4a,0xc9,0x4a,0x92,0xaa,0xca,0xaa,0x29,
    0x92,0x4a,0xc9,0xaa,0x25,0x95,0x49,0x95,0xc9,0x92,0xd2,0xd2,0x92,0x92,0x55,0xca,
    0xaa,0x95,0x92,0x4a,0x92,0xc9,0x92,0x92,0x52,0x52,0xd5,0x92,0xd2,0x2a,0xd2,0xca,
    0x92,0x95,0x49,0x95,0xc9,0xaa,0x95,0x25,0xc9,0xd2,0xaa,0x55,0x29,0xca,0x2a,0xc9,
    0x92,0x92,0x49,0x29,0xaa,0xd5,0x92,0xca,0xca,0xd2,0xca,0x92,0x95,0x49,0x95,0xc9,
    0xaa,0x95,0x25,0xc9,0xd2,0xaa,0x55,0x29,0x92,0x95,0xca,0xca,0x92,0x92,0x52,0x52,
    0xd5,0xd2,0x52,0x25,0x4a,0x92,0xaa,0xca,0xaa,0x29,0x52,0xd5,0x2a,0xca,0x92,0xa9,
    0x55,0xa5,0x92,0xa9,0xaa,0xc9,0x92,0x55,0xca,0xaa,0x95,0xca,0xaa,0x92,0x49,0x92,
    0x49,0x92,0xaa,0x29,0x92,0x92,0xa9,0xc9,0x92,0xaa,0x29,0xaa,0x95,0xca,0xaa,0xca,
    0x4a,0xd2,0x92,0x29,0xaa,0x29,0x92,0x4a,0xd2,0x4a,0x92,0xc9,0xca,0x52,0xd5,0x92,
    0x4a,0xca,0x92,0x25,0x4a,0x29,0xaa,0x95,0x92,0x4a,0x4a,0x29,0xaa,0x29,0x52,0xa5,
    0xd2,0x4a,0xd2,0x2a,0xc9,0x92,0x2a,0x52,0xa5,0xd2,0x4a,0xd2,0x2a,0x49,0x92,0x25,
    0xaa,0x29,0x4a,0xca,0xd2,0x92,0x92,0x55,0xca,0xaa,0x95,0x92,0x4a,0xd2,0x4a,0x52,
    0x2a,0x49,0x95,0xc9,0x92,0xa9,0x49,0xca,0x92,0x95,0x49,0x95,0x25,0xd2,0xca,0x92,
    0x92,0xd2,0xaa,0xca,0xaa,0x95,0x92,0x4a,0x92,0x92,0x4a,0xaa,0xca,0xaa,0x95,0x49,
    0x25,0x49,0xd5,0x52,0xd2,0x52,0x25,0xc9,0x52,0x4a,0xd2,0x92,0xa5,0x29,0x52,0x95,
    0xca,0xaa,0x2a,0x25,0x92,0x92,0x92,0x52,0x25,0xaa,0x4a,0x92,0x55,0x52,0x29,0xaa,
    0x29,0x92,0x92,0x25,0x4a,0x92,0xaa,0xca,0xaa,0x29,0x52,0x95,0x49,0xd5,0x52,0xd2,
    0x52,0x25,0xc9,0x52,0x92,0x92,0x92,0xa5,0xa5,0x52,0xd5,0x92,0xaa,0xca,0x92,0x92,
    0x4a,0xa5,0x52,0x55,0xd2,0xca,0xd2,0x4a,0x92,0x92,0x92,0x92,0x25,0xc9,0xaa,0x4a,
    0x55,0xa5,0x92,0x2a,0xaa,0x95,0xca,0x2a,0xa9,0x29,0xca,0x92,0x25,0xd5,0xca,0xd2,
    0x2a,0x92,0xc9,0x92,0xc9,0x52,0x52,0xd5,0x92,0xd2,0xd2,0x4a,0xca,0xd2,0x92,0xc9,
    0xaa,0x95,0x92,0x29,0xca,0xd2,0x92,0x55,0xca,0xaa,0x95,0xca,0xaa,0xc9,0x92,0x92,
    0x4a,0x29,0xaa,0x95,0x92,0x92,0xa9,0x25,0x92,0x92,0x92,0x52,0x95,0x52,0x29,0xca,
    0xd2,0x92,0xa5,0x29,0xaa,0x29,0x92,0x4a,0x55,0x55,0xa9,0xca,0xaa,0x95,0x92,0x2a,
    0xd2,0x4a,0x52,0x2a,0x49,0xd5,0x52,0x92,0xca,0x92,0x92,0x52,0xc9,0xca,0xd2,0x2a,
    0x52,0x92,0xca,0x2a,0x49,0x92,0x2a,0xaa,0xc9,0xca,0x92,0x95,0xca,0x92,0x92,0x92,
    0x92,0x4a,0xca,0x52,0x29,0xc9,0x92,0x92,0x49,0x29,0xaa,0xd5,0x92,0x52,0x25,0x2a,
    0x92,0x92,0x92,0x92,0x95,0x52,0x29,0x25,0x2a,0xd2,0x2a,0x49,0x55,0xd2,0x92,0x2a,
    0xc9,0xca,0x2a,0x52,0x52,0x25,0x92,0xc9,0x92,0xca,0x92,0xd2,0xca,0xd2,0x52,0xd5,
    0x92,0x92,0xca,0xd2,0xd2,0x52,0xd5,0x92,0xd5,0xca,0x92,0x92,0x55,0x25,0xd2,0x2a,
    0x49,0x55,0xd2,0x52,0x95,0x52,0x52,0xd5,0x92,0x55,0x49,0x4a,0xca,0xca,0x92,0x92,
    0x92,0x92,0xaa,0x25,0xaa,0xca,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xd2,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xc9,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0xd2,0x92,0x92,0x92,0x92,0x92,0xaa,0x55,0x55,0xd5,0x52,
    0x55,0x55,0xc9,0xd2,0x92,0x92,0x92,0x55,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0x92,0xd2,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0xc9,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xca,0x92,0x92,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0xd2,0x92,0x95,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0x52,0x2a,0x29,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x95,0x29,0x92,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0xa5,0x2a,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x29,
    0x29,0x25,0x95,0xa5,0x52,0x92,0x92,0xd2,0x92,0x49,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0x92,0x92,0x2a,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x52,0x92,0x92,
    0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xd2,0x2a,0x92,0x92,0x92,0x92,0x92,0x92,0x92,
    0x92,0xc9,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0x92,0xd2,0x4a,0x49,0x25,0x2a,
    0xd2,0x92,0x4a,0x2a,0x92,0xa5,0x92,0x49,0xc9,0x92,0x92,0x92,0x92,0x92,0xfe
];

var timingPulses = new Array(3110).fill(0xF9);

var txData = new Uint8Array(txHandshake.length+microBootLoader.length+timingPulses.length);
txData.set(txHandshake, 0);
txData.set(microBootLoader, txHandshake.length);
txData.set(timingPulses, txHandshake.length+microBootLoader.length);

//Add programming receive handler
chrome.serial.onReceive.addListener(hearFromProp);

function openPort(portPath, baudrate) {
    console.log("in open");
    return new Promise(function(fulfill, reject) {
        chrome.serial.connect(portPath, {
                'bitrate': parseInt(baudrate),
                'dataBits': 'eight',
                'parityBit': 'no',
                'stopBits': 'one',
                'ctsFlowControl': false
            },
            function (openInfo) {
                if (openInfo === undefined) {
                    console.log("Could not open port %s", portPath);
                } else {
                    portID = openInfo.connectionId;
                    console.log("Port", portPath, "open with ID", portID);
                    fulfill(portID);
//TODO Determine why portID (openInfo.connectionId) always increases per OS session and not just per app session.  Is that a problem?  Are we not cleaning up something that should be addressed?
                }
            }
        );
    });
}

function closePort() {
    isOpen()
        .then(function() {
            chrome.serial.disconnect(portID,
                function (closeResult) {
                    if (closeResult === true) {
                        portID = -1;
                        console.log("Port closed");
                    } else {
                        console.log("Port not closed");
                    }
                });
        });
}

function isOpen() {
    return new Promise(function(fulfill, reject) {
        if (portID >= 0) {
            fulfill(true);
        } else {
            reject(false);
        };
    });
}

function talkToProp() {
    console.log("talking to Propeller");
    isOpen()
        .then(function() {

//           return transport.flush();
//        })
//        .then(function(){
//            if(transport.isPaused()){
//                return transport.unpause();
//            }
//        })
//        .then(function(){
            propComm.stage = sgHandshake;
            setControl({dtr: false})
        })
        .then(function() {
            setControl({dtr: true});
        })
        .then(function() {
            setTimeout(function(){send(txData)}, 100);
        })
//            if(transport.isPaused()){
//                return transport.unpause();
//            }
//        })
        .then(function() {
            setControl({dtr: false});
            setControl({dtr: true});
            flush();
        });

//    return nodefn.bindCallback(promise, cb);
    console.log("done talking to Propeller");
}
//TODO flag that we're programming so this receiver doesn't work needlessly
function hearFromProp(info) {
//    console.log("hearFromProp: received", info.data.byteLength, "bytes =", ab2num(info.data));
    // Exit immediately if we're not programming
    if (propComm.stage === sgIdle) {return}

    var stream = ab2num(info.data);
    var i = 0;

    if (propComm.stage === sgHandshake) {
        if (propComm.rxCount < rxHandshake.length) {
            const len = Math.min(stream.length, rxHandshake.length-propComm.rxCount);
            while (i < len && propComm.rxCount < rxHandshake.length) {
                //More data to match against rxHandshake...
                if (stream[i++] === rxHandshake[propComm.rxCount++]) {
                    //Handshake matches so far...
                    if (propComm.rxCount === rxHandshake.length) {
                        //Entire handshake matches!  Note valid and prep for next stage
                        propComm.handshake = stValid;
                        propComm.rxCount = 0;
                        propComm.stage = sgVersion;
                        break;
                    }
                } else {
                    //Handshake failure!  Ignore the rest
                    propComm.handshake = stInvalid;
                    propComm.stage = sgIdle;
                    break;
                }
            }
        }
    }
/*
    if (propComm.stage === sgVersion) {

    }
    if (propComm.stage === sgRAMChecksum) {

    }
    if (propComm.stage === sgEEProgram) {

    }
    if (propComm.stage === sgEEChecksum) {

    }
*/
}

//TODO determine if there's a better way to promisify callbacks (with boolean results)
function setControl(options) {
    return new Promise(function(fulfill, reject) {
        chrome.serial.setControlSignals(portID, options, function(controlResult) {
            if (controlResult) {
                fulfill(true);
            } else {
                reject(false);
            }
        });
    });
}

function flush() {
    return new Promise(function(fulfill, reject) {
        chrome.serial.flush(portID, function(flushResult) {
            if (flushResult) {
                fulfill(true);
            } else {
                reject(false);
            }
        });
    });
}

function send(data) {
    if (typeof data === 'string') {
        data = str2ab(data);
    }
    if (data instanceof ArrayBuffer === false) {
        data = buffer2ArrayBuffer(data);
    }

    return chrome.serial.send(portID, data, function (sendResult) {
    });
}

// Convert string to ArrayBuffer
function str2ab(str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

// Convert buffer to ArrayBuffer
function buffer2ArrayBuffer(buffer) {
    var buf = new ArrayBuffer(buffer.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < buffer.length; i++) {
        bufView[i] = buffer[i];
    }
    return buf;
}
