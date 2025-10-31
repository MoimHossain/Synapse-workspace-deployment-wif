import * as httpClient from 'typed-rest-client/HttpClient';
import { IHeaders } from 'typed-rest-client/Interfaces';

var path = require('path');
var AdmZip = require('adm-zip');
const zipfileName = 'synapse.zip';

export interface RepositoryFile {
    fileName: string,
    content: string;
}

export abstract class RepositoryDownloader {
    fs = require('fs');
    packagejson = require('./package.json');
    userAgent: string = 'synapse-cicd-deploy-task-' + this.packagejson.version;

    async downloadFiles(downloadPath: string, token: string, client: httpClient.HttpClient): Promise<string> {
         var headers = this.getHeaders(token);
         var url = this.getDownloadFilesURL();
         console.log("DownloadFilesURL url" + url);
         return new Promise<string>((resolve, reject) => {
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
    }

    
    async extractFiles(downloadPath: string, folderPath: string): Promise<RepositoryFile[]> {
       try {
           return new Promise<RepositoryFile[]>((resolve, reject) => {
               var zip = new AdmZip(path.join(downloadPath, zipfileName));
               var zipEntries = zip.getEntries();
               var filesArr = new Array();
               zipEntries.forEach((zipEntry: any) => {
                   if (zipEntry.isDirectory != true) {
                       let file: RepositoryFile = {
                           fileName: zipEntry.entryName,
                           content: zipEntry.getData().toString('utf8')
                       };
                       
                       console.log("File: " + file.fileName);
                       filesArr.push(file);
                   }
               }, (reason: any) => {
                   console.log("Error while extracting files: " + reason);
                   reject(reason);
               });
               resolve(filesArr);
           });
       } catch (err) {
           throw new Error("Failed to extract: " + err);
       }
   }

   abstract getHeaders(token: string): IHeaders;
   abstract getDownloadFilesURL(): string;
   abstract getEndPointToken(endpoint: string): string;
}
