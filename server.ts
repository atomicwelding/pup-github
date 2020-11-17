import express = require('express')
import path = require('path')
import fs = require('fs')


class App {
    private app: any;
    private params: {
        port: number,
        logPath: string,
        viewPath: string,
        uploaded: string
    };
    
    public constructor() {
        this.app = express();
        this.params = {
            port:8888,
            logPath:'/logs/test.log',
            viewPath:'/build/',
            uploaded:'/build/uploaded/'
        }

        this.logRequest = this.logRequest.bind(this);
    }

    private logRequest(req: express.Request, res: express.Response, next: any): void {
        /**
         * Short middleware to log requests
         * TODO : Create a file per day instead of a big test.log
         */
        const log = path.join(__dirname + this.params.logPath);
        fs.appendFile(log, req.url + '\n', () => console.log(req.url));
        next();
    }

    public run(): void {
        /**
         * Main method
         */

        // middlewares
        this.app.use(this.logRequest);
        this.app.use(express.static(path.join(__dirname + this.params.viewPath)));

        // handling api
        this.app.get('/api', (req: express.Request, res: express.Response) => {
            /**
             * Provides a timestamp
             */
            const d: Date = new Date(), timestamp: string = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDay(); 
            res.send(JSON.stringify({
                timestamp:timestamp
            }));
        });

        this.app.get('/api/files', (req: express.Request, res: express.Response) => {
            /**
             * List files that have been uploaded
             */
            const dir = path.join(__dirname + this.params.uploaded);
            fs.readdir(dir, (err, items) => {
                if(err) res.send('ERROR API, please contact the webmaster');
                else res.send(JSON.stringify({
                    files:items
                }));
            });
        });

        this.app.get('/api/file/:filename', (req: express.Request, res: express.Response) => {
            /**
             * Get a specific file
             */
            const file = path.join(__dirname + this.params.uploaded + req.params.filename);
            fs.access(file, (err) => {
                if(err) {
                    console.log(err);
                    res.send('Cannot ' + req.method + ' ' + req.url);
                } 
                else res.sendFile(file);
            })
        });

        //this.app.post

        this.app.listen(this.params.port);
    }
}

let app: App = new App();
app.run();