import * as deployUtils from './deployutils';
import * as httpClient from 'typed-rest-client/HttpClient';
import * as httpInterfaces from 'typed-rest-client/Interfaces';
import task = require('azure-pipelines-task-lib/task');
import * as uuid from 'uuid';

const packagejson = require('./package.json');
const userAgent: string = 'synapse-cicd-deploy-task-' + packagejson.version;
var requestOptions: httpInterfaces.IRequestOptions = {};
let ignoreSslErrors: string = task.getVariable("VSTS_ARM_REST_IGNORE_SSL_ERRORS")!;
requestOptions.ignoreSslError = (ignoreSslErrors?.toLowerCase() == "false");
const client: httpClient.HttpClient = new httpClient.HttpClient(userAgent, undefined, requestOptions);

async function getDeploymentUrl(baseUrl: string, rgName: string, subId: string): Promise<string> {
    var url = `${baseUrl}/subscriptions/${subId}/resourcegroups/${rgName}/providers/Microsoft.Resources/deployments/${uuid.v4()}?api-version=2019-10-01`;
    const regex = /([^:]\/)\/+/gi;
    return url.replace(regex, '$1');
}

async function getWorkspaceInfoUrl(baseUrl: string, rgName: string, subId: string, workspace: string): Promise<string> {
    var url = `${baseUrl}/subscriptions/${subId}/resourcegroups/${rgName}/providers/Microsoft.Synapse/workspaces/${workspace}?api-version=2019-06-01-preview`;
    const regex = /([^:]\/)\/+/gi;
    return url.replace(regex, '$1');
}

async function checkDeploymentStatus(url: string, headers: httpInterfaces.IHeaders) {
    var timeout = new Date().getTime() + (60000 * 20); // 20 minutes
    var delayMilliSecs = 30000;
    var status = "";
    while (true) {
        var currentTime = new Date().getTime();
        if (timeout < currentTime) {
            console.log('Current time: ', currentTime);
            throw new Error("Timeout error in checkDeploymentStatus");
        }
        var res = await client.get(url, headers);
        var resStatus = res.message.statusCode;
        console.log(`CheckDeploymentStatus: ${resStatus}; status message: ${res.message.statusMessage}`);
        if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
            throw new Error(`=> status: ${resStatus}; status message: ${res.message.statusMessage}`);
        }
        var body = await res.readBody();
        if (!body) {
            console.log("No status response for url: ", url);
            await delay(delayMilliSecs);
            break;
        }
        let responseJson = JSON.parse(body);
        console.log(JSON.stringify(responseJson));
        status = responseJson['status'];
        if (status == 'Succeeded' || status == 'Failed' || status == 'Canceled') {
            return status;
        } else {
            console.log("Arm deployment status: ", status);
            await delay(delayMilliSecs);
        }
    }
}

async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function deploy(armTemplate: string, armTemplateParameter: string): Promise<string> {
    try {
        var params = await deployUtils.getParams();
        var url: string = await getDeploymentUrl(params.tokenCredentials.baseUrl, params.resourceGroup, params.subscriptionId);
        console.log('Arm resources deployment url: ', url);
        var token = await params.tokenCredentials.getToken();
        var parameters: any;
        if (!!armTemplateParameter) {
            var armTemplateParameterObj = JSON.parse(armTemplateParameter);
            parameters = armTemplateParameterObj["parameters"];
        }

        return new Promise<string>((resolve, reject) => {

            var headers: httpInterfaces.IHeaders = {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8'
            }

            let requestBody =
            `{
                "properties": {
                    "mode": "Incremental",
                    "debugSetting": {
                        "detailLevel": "requestContent, responseContent"
                    },
                    "template": ${JSON.stringify(armTemplate)}
                }
            }`;

            var timeout = new Date().getTime() + 30 * 60 * 1000;

            client.put(url, requestBody, headers).then(async (res) => {
                var resStatus = res.message.statusCode;
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    console.log(`Arm template deployment failed, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    return reject(deployUtils.DeployStatus.failed);
                }

                console.log(`Arm template deployment status: ${resStatus}; status message: ${res.message.statusMessage}`);
                var statusUrl: string = "";

                var rawHeaders = res.message.rawHeaders;
                for (var i = 0; i < rawHeaders.length; i++) {
                    var header = rawHeaders[i].toLowerCase();
                    if (header.indexOf('microsoft.resources') > -1 &&
                        header.indexOf('deployments') > -1 &&
                        header.indexOf('operationstatuses') > -1) {
                        statusUrl = header;
                    }
                }

                console.log(`Deployment tracking end point: ${statusUrl}`);

                if(statusUrl != ""){
                    var status = await checkDeploymentStatus(statusUrl, headers);
                    console.log(`Final arm deployment status: ${status}`);
                    if (status == 'Succeeded') {
                        return resolve(deployUtils.DeployStatus.success);
                    }
                    return reject(deployUtils.DeployStatus.failed);
                }
            }, (reason) => {
                console.log('Arm Template Deployment Failed: ', reason);
                return reject(deployUtils.DeployStatus.failed);
            });
        });
    } catch (err) {
        throw new Error("ARM template deployment failed: " + err);
    }
}

export async function getWorkspaceLocation(workspace: string): Promise<string> {
    var params = await deployUtils.getParams();
    var url: string = await getWorkspaceInfoUrl(params.tokenCredentials.baseUrl, params.resourceGroup, params.subscriptionId, workspace);
    console.log('Workspace info url: ', url);
    var token = await params.tokenCredentials.getToken();
    var headers: httpInterfaces.IHeaders = {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json; charset=utf-8'
    }

    return new Promise<string>((resolve, reject) => {
        client.get(url, headers).then(async (res) => {
            var resStatus = res.message.statusCode;
            if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                console.log(`Failed to fetch workspace info, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                return reject("Failed to fetch workspace info " + res.message.statusMessage);
            }
            var body = await res.readBody();
            if (!body) {
                console.log("No response body for url: ", url);
                return reject("Failed to fetch workspace info response");
            }
            let responseJson = JSON.parse(body);
            console.log("Workspace info response: " + JSON.stringify(responseJson));
            var location: string = responseJson['location'];
            if (!!location) {
                console.log("Workspace location: " + location);
                return resolve(location);
            } else {
                return reject("Failed to fetch workspace location from response");
            }
        }, (reason) => {
                console.log('Failed to fetch workspace location: ', reason);
            return reject(deployUtils.DeployStatus.failed);
        });
    });
}