import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';
import {exec, spawn} from "child_process";
const util = require('util');
const task = require('azure-pipelines-task-lib/task');

export class BundleManager {
    private static readonly prodBundleUrl = 'https://web.azuresynapse.net/assets/cmd-api/main.js';
    private static readonly ppeBundleUrl = 'https://web-ci.azuresynapse.net/assets/cmd-api/main.js';
    private static readonly defaultBundleDir: string = 'downloads';
    private static readonly defaultBundleName: string = 'main.js';
    private _bundleUrl = BundleManager.prodBundleUrl;
    private _source = "Prod";
    public static readonly defaultBundleFilePath = path.join(process.cwd(), BundleManager.defaultBundleDir, BundleManager.defaultBundleName);


    constructor(source: string = 'prod') {
        this._source = source;
        if(source.toLowerCase() == "ppe"){
            this._bundleUrl = BundleManager.ppeBundleUrl;
            console.log("Setting bundle source as PPE");
        }

        console.log("Bundle source : ", this._bundleUrl);
    }

    public async invokeBundle(): Promise<void>{
        try{
            if (!fs.existsSync(BundleManager.defaultBundleDir)) {
                fs.mkdirSync(BundleManager.defaultBundleDir);
            }
            const file = fs.createWriteStream(BundleManager.defaultBundleFilePath);
            return new Promise((resolve, reject) => {
                console.log("Downloading asset file");
                https.get(this._bundleUrl, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log("Asset file downloaded at : ", BundleManager.defaultBundleFilePath);
                        return resolve();
                    });
                });
            });
        }
        catch(ex){
            console.log("Bundle manager failed to download asset file.");
            throw ex;
        }

    }

    public static async ExecuteShellCommand(cmd: string){
        console.log("Executing shell command");
        console.log("Command : ", cmd);
        try {

            const result = await new Promise((resolve, reject) => {
                let command = spawn(cmd, {shell: true});

                command.stdout.on('data', data => {
                    console.log("Stdout: ", data.toString());
                });

                command.stderr.on('data', data => {
                    console.log("Stderr: ", data.toString());
                });

                command.on('error', err => {
                    if(err){
                        console.log("Error: ", err.toString());
                        return reject("Shell execution failed.");
                    }
                });

                command.on('close', code => {
                    if(code != 0){
                        return reject("Shell execution failed.");
                    }
                    else{
                        return resolve("Shell command execution is successful.");
                    }
                });
            });

            if (result == "Shell execution failed."){
                throw new Error("Shell execution failed.");
            }
            console.log("Shell command execution is successful.");
        } catch (e) {
            console.log("Shell execution failed.");
            throw e;
        }
    }
}

