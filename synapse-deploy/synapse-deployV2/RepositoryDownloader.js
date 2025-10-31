"use strict";
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
exports.RepositoryDownloader = void 0;
var path = require('path');
var AdmZip = require('adm-zip');
const zipfileName = 'synapse.zip';
class RepositoryDownloader {
    constructor() {
        this.fs = require('fs');
        this.packagejson = require('./package.json');
        this.userAgent = 'synapse-cicd-deploy-task-' + this.packagejson.version;
    }
    downloadFiles(downloadPath, token, client) {
        return __awaiter(this, void 0, void 0, function* () {
            var headers = this.getHeaders(token);
            var url = this.getDownloadFilesURL();
            console.log("DownloadFilesURL url" + url);
            return new Promise((resolve, reject) => {
                var zipFilePath = path.join(downloadPath, zipfileName);
                const file = this.fs.createWriteStream(zipFilePath);
                client.get(url, headers).then((res) => {
                    var resStatus = res.message.statusCode;
                    console.log(`DownloadFiles status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    if (resStatus != 200 && resStatus != 201) {
                        return reject(`Failed to download file, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    }
                    res.message.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        resolve("Successful");
                    });
                }, (reason) => {
                    this.fs.unlink(zipFilePath);
                    reject(reason);
                });
            });
        });
    }
    extractFiles(downloadPath, folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return new Promise((resolve, reject) => {
                    var zip = new AdmZip(path.join(downloadPath, zipfileName));
                    var zipEntries = zip.getEntries();
                    var filesArr = new Array();
                    zipEntries.forEach((zipEntry) => {
                        if (zipEntry.isDirectory != true) {
                            let file = {
                                fileName: zipEntry.entryName,
                                content: zipEntry.getData().toString('utf8')
                            };
                            console.log("File: " + file.fileName);
                            filesArr.push(file);
                        }
                    }, (reason) => {
                        console.log("Error while extracting files: " + reason);
                        reject(reason);
                    });
                    resolve(filesArr);
                });
            }
            catch (err) {
                throw new Error("Failed to extract: " + err);
            }
        });
    }
}
exports.RepositoryDownloader = RepositoryDownloader;
//# sourceMappingURL=RepositoryDownloader.js.map