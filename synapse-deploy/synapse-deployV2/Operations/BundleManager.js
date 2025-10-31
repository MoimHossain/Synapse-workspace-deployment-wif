"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleManager = void 0;
const fs = __importStar(require("fs"));
const https = __importStar(require("https"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const util = require('util');
const task = require('azure-pipelines-task-lib/task');
class BundleManager {
    constructor(source = 'prod') {
        this._bundleUrl = BundleManager.prodBundleUrl;
        this._source = "Prod";
        this._source = source;
        if (source.toLowerCase() == "ppe") {
            this._bundleUrl = BundleManager.ppeBundleUrl;
            console.log("Setting bundle source as PPE");
        }
        console.log("Bundle source : ", this._bundleUrl);
    }
    invokeBundle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
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
            catch (ex) {
                console.log("Bundle manager failed to download asset file.");
                throw ex;
            }
        });
    }
    static ExecuteShellCommand(cmd) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Executing shell command");
            console.log("Command : ", cmd);
            try {
                const result = yield new Promise((resolve, reject) => {
                    let command = child_process_1.spawn(cmd, { shell: true });
                    command.stdout.on('data', data => {
                        console.log("Stdout: ", data.toString());
                    });
                    command.stderr.on('data', data => {
                        console.log("Stderr: ", data.toString());
                    });
                    command.on('error', err => {
                        if (err) {
                            console.log("Error: ", err.toString());
                            return reject("Shell execution failed.");
                        }
                    });
                    command.on('close', code => {
                        if (code != 0) {
                            return reject("Shell execution failed.");
                        }
                        else {
                            return resolve("Shell command execution is successful.");
                        }
                    });
                });
                if (result == "Shell execution failed.") {
                    throw new Error("Shell execution failed.");
                }
                console.log("Shell command execution is successful.");
            }
            catch (e) {
                console.log("Shell execution failed.");
                throw e;
            }
        });
    }
}
exports.BundleManager = BundleManager;
BundleManager.prodBundleUrl = 'https://web.azuresynapse.net/assets/cmd-api/main.js';
BundleManager.ppeBundleUrl = 'https://web-ci.azuresynapse.net/assets/cmd-api/main.js';
BundleManager.defaultBundleDir = 'downloads';
BundleManager.defaultBundleName = 'main.js';
BundleManager.defaultBundleFilePath = path.join(process.cwd(), BundleManager.defaultBundleDir, BundleManager.defaultBundleName);
//# sourceMappingURL=BundleManager.js.map