"use strict";
exports.__esModule = true;
var express = require("express");
var path = require("path");
var fs = require("fs");
var App = /** @class */ (function () {
    function App() {
        this.app = express();
        this.params = {
            port: 8888,
            logPath: '/logs/test.log',
            viewPath: '/build/',
            uploaded: '/build/uploaded/'
        };
        this.logRequest = this.logRequest.bind(this);
    }
    App.prototype.logRequest = function (req, res, next) {
        /**
         * Short middleware to log requests
         * TODO : Create a file per day instead of a big test.log
         */
        var log = path.join(__dirname + this.params.logPath);
        fs.appendFile(log, req.url + '\n', function () { return console.log(req.url); });
        next();
    };
    App.prototype.run = function () {
        /**
         * Main method
         */
        var _this = this;
        // middlewares
        this.app.use(this.logRequest);
        this.app.use(express.static(path.join(__dirname + this.params.viewPath)));
        // handling api
        this.app.get('/api', function (req, res) {
            var d = new Date(), timestamp = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDay();
            res.send(JSON.stringify({
                timestamp: timestamp
            }));
        });
        this.app.get('/api/files', function (req, res) {
            var dir = path.join(__dirname + _this.params.uploaded);
            fs.readdir(dir, function (err, items) {
                if (err)
                    res.send('ERROR API, please contact the webmaster');
                else
                    res.send(JSON.stringify({
                        files: items
                    }));
            });
        });
        this.app.get('/api/file/:filename', function (req, res) {
            var file = path.join(__dirname + _this.params.uploaded + req.params.filename);
            fs.access(file, function (err) {
                if (err) {
                    console.log(err);
                    res.send('Cannot ' + req.method + ' ' + req.url);
                }
                else {
                    res.sendFile(file);
                }
            });
        });
        this.app.listen(this.params.port);
    };
    return App;
}());
var app = new App();
app.run();
