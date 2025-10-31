import * as httpClient from 'typed-rest-client/HttpClient';
import { IHeaders } from 'typed-rest-client/Interfaces';
import { RepositoryFile, RepositoryDownloader } from './RepositoryDownloader';

interface FileName {
    filename: string;
}

interface FilesResponse {
    files: FileName[];
}

interface GitConfiguration {
    commitid: string,
    branch: string,
    repo: string;
}

export class GithubFileDownloader extends RepositoryDownloader
{
    task = require('azure-pipelines-task-lib/task');
    
    gitHubBaseUrl = "https://api.github.com"
    repositoryName: string;
    branch: string;
    constructor(repositoryName: string, branch: string) {
        super();
        this.repositoryName = repositoryName;
        this.branch = branch;
    }

    getDownloadFilesURL(): string {
        return `${this.gitHubBaseUrl}/repos/${this.repositoryName}/zipball/${this.branch}`;
    }

    getEndPointToken(githubEndpoint: string): string {
        const githubEndpointObject = this.task.getEndpointAuthorization(githubEndpoint, false);
        let githubEndpointToken: string = "";
        
        if (!!githubEndpointObject) {
            this.task.debug('Endpoint scheme: ' + githubEndpointObject.scheme);
    
            if (githubEndpointObject.scheme === 'PersonalAccessToken') {
                githubEndpointToken = githubEndpointObject.parameters.accessToken;
            } else if (githubEndpointObject.scheme === 'OAuth') {
                githubEndpointToken = githubEndpointObject.parameters.AccessToken;
            } else if (githubEndpointObject.scheme === 'Token') {
                githubEndpointToken = githubEndpointObject.parameters.AccessToken;
            } else if (githubEndpointObject.scheme) {
                throw new Error(this.task.loc('InvalidEndpointAuthScheme', githubEndpointObject.scheme));
            }
        }
    
        if (githubEndpointToken === "") {
            throw new Error(this.task.loc('InvalidGitHubEndpoint', githubEndpoint));
        }
    
        return githubEndpointToken;
    }

    getHeaders(token: string): IHeaders {
        return {
            "Authorization": "Token " + token,
            "User-Agent": this.userAgent
        };
    }

    async downloadFiles(downloadPath: string, token: string, client: httpClient.HttpClient): Promise<string> {
        return super.downloadFiles(downloadPath, token, client);
    }
    
    async extractFiles(downloadPath: string, folderPath: string): Promise<RepositoryFile[]> {
        return super.extractFiles(downloadPath, folderPath);
    }
    /*
    async getLatestCommidId(token: string, repositoryName: string, user: string, branch: string): Promise<string> {
        // repositoryName contains user name as well
        const url = `${gitHubBaseUrl}/repos/${repositoryName}/commits/${branch}`;
        console.log('URL to get latest commidId', url);
        var headers = this.getHeaders(token);
        return new Promise<string>((resolve, reject) => {
            client.get(url, headers).then((res) => {
                res.readBody().then((body) => {
                    let responseJson = JSON.parse(body);
                    resolve(responseJson["sha"]);
                });
            }, (reason) => {
                reject(reason);
            });
        });
    }

    async getFilesByCommitIds(commitId1: string, commitId2: string, repositoryName: string, token: string, user: string): Promise<FilesResponse> {
        const url = `${gitHubBaseUrl}/repos/${repositoryName}/compare/${commitId1}...${commitId2}`;
        console.log('URL to get modified files between two commits', url);
    
        var headers = this.getHeaders(token);
        return new Promise<FilesResponse>((resolve, reject) => {
            client.get(url, headers).then((res) => {
                res.readBody().then((body) => {
                    let responseBody = JSON.parse(body);
                    console.log('getFilesByCommitIds responseBody', responseBody);
                    let filesResponse: FilesResponse = {
                        files: responseBody["files"]
                    }
                    console.log('getFilesByCommitIds filesResponse', filesResponse);
                    resolve(filesResponse);
                });
            }, (reason) => {
                reject(reason);
            });
        });
    }

    getGitHubUser(token: string): Promise<string> {
        var url = `${gitHubBaseUrl}/user`;
        console.log('URL to get github user', url);
        var headers = this.getHeaders(token);
        return new Promise<string>((resolve, reject) => {
            client.get(url, headers).then((res) => {
                res.readBody().then((body) => {
                    let responseJson = JSON.parse(body);
                    resolve(responseJson["login"]);
                });
            }, (reason) => {
                reject(reason);
            });
        });
    }*/
}


/*
export function getTargetWsInfo(workSpace: string, token: string): GitConfiguration {
    // Implement this once after APIs from synpase gateway are ready 
    // TODO
    let gitConfiguration: GitConfiguration = {
        commitid: "5e8896c9253c6de4b8264205dbae1cae0cd223ce",
        branch: "",
        repo: ""
    }

    return gitConfiguration;
}

*/

