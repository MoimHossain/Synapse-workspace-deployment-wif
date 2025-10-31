import { IHeaders } from 'typed-rest-client/Interfaces';
import { RepositoryDownloader, RepositoryFile } from './RepositoryDownloader';
import * as httpClient from 'typed-rest-client/HttpClient';
import * as httpInterfaces from 'typed-rest-client/Interfaces';

export class AzureRepoFileDownloader extends RepositoryDownloader {
    task = require('azure-pipelines-task-lib/task');

    azureRepoBaseUrl = "";
    project: string;
    repository: string;
    branch: string;
    constructor(azureRepoBaseUrl: string, project: string, repository: string, branch: string) {
        super();
        this.azureRepoBaseUrl = azureRepoBaseUrl;
        this.project = project;
        this.repository = repository;
        this.branch = branch;
    }

    async downloadFiles(downloadPath: string, token: string, client: httpClient.HttpClient): Promise<string> {
        return super.downloadFiles(downloadPath, token, client);
    }

    async extractFiles(downloadPath: string, folderPath: string): Promise<RepositoryFile[]> {
        return super.extractFiles(downloadPath, folderPath);
    }

    getEndPointToken(endpoint: string): string {
        const externalAuth  = this.task.getEndpointAuthorization(endpoint, false);
        const endpointToken = externalAuth.parameters["apitoken"];
        if (endpointToken === "")
            throw new Error(this.task.loc('InvalidEndpoint', endpoint));

        return endpointToken;
    }

    getHeaders(token: string): IHeaders {
        let buff = new Buffer(`:${token}`);
        var base64token = buff.toString('base64');
        var headers: httpInterfaces.IHeaders = {
            'Authorization': `Basic ${base64token}`,
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent
        }

        return headers;
    }

    getDownloadFilesURL() : string {
        var url = this.azureRepoBaseUrl + `/${this.project}/_apis/git/repositories/${this.repository}/items?path=//&versionDescriptor%5BversionOptions%5D=0&versionDescriptor%5BversionType%5D=0&versionDescriptor%5Bversion%5D=${this.branch}&resolveLfs=true&%24format=zip`;
        const regex = /([^:]\/)\/+/gi;
        return url.replace(regex, '$1');
    }
}
