'use strict';

var fs = require('fs'),
    child_process = require('child_process'),
    players = [
        'mplayer',
        'afplay',
        'mpg123',
        'mpg321',
        'play',
        'omxplayer',
        'aplay',
        'cmdmp3'
    ];

function Sound(opts) {
    opts = opts || {};

    this.players = opts.players || players;
    this.player = opts.player || findExec(this.players);
    this.urlRegex = /^(https?|ftp):\/\/[^\s\/$.?#].[^\s]*$/i;

    this.play = function (what, options, next) {
        next = next || function () { };
        next = typeof (options) === 'function' ? options : next;
        options = options || {};

        var isURL = this.player == 'mplayer' && this.urlRegex.test(what);

        if (!what) return next(new Error('No audio file specified'));

        if (!this.player) {
            return next(new Error('Couldn\'t find a suitable audio player'))
        }

        var args = Array.isArray(options[this.player]) ? options[this.player].concat(what) : [what];
        return child_process.execFile(this.player, args, options, function (err, stdout, stderr) {
            next(err && !err.killed ? err : undefined);
        });
    };

    this.load = function (file) {
        var reader = fs.createReadStream(file).pipe(wav.Reader());

        var buffer = null;

        wavReader.on('format', function (format) {
            console.log("Playing wav.", format);
            var aplay = spawn('aplay', [
                "-r", String(format.sampleRate),
                "-c", String(format.channels),
                "-f", "S16_LE"
            ]
            );

            wavReader.pipe(aplay.stdin);
        });
    };

    this.test = function (next) { this.play('./media/ding.mp3', next) };
}

module.exports = function (opts) {
    return new Sound(opts)
}