"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.deploy = deploy;
exports.getWorkspaceLocation = getWorkspaceLocation;
const deployUtils = __importStar(require("./deployutils"));
const httpClient = __importStar(require("typed-rest-client/HttpClient"));
const task = require("azure-pipelines-task-lib/task");
const uuid = __importStar(require("uuid"));
const packagejson = require('./package.json');
const userAgent = 'synapse-cicd-deploy-task-' + packagejson.version;
var requestOptions = {};
let ignoreSslErrors = task.getVariable("VSTS_ARM_REST_IGNORE_SSL_ERRORS");
requestOptions.ignoreSslError = ((ignoreSslErrors === null || ignoreSslErrors === void 0 ? void 0 : ignoreSslErrors.toLowerCase()) == "false");
const client = new httpClient.HttpClient(userAgent, undefined, requestOptions);
function getDeploymentUrl(baseUrl, rgName, subId) {
    return __awaiter(this, void 0, void 0, function* () {
        var url = `${baseUrl}/subscriptions/${subId}/resourcegroups/${rgName}/providers/Microsoft.Resources/deployments/${uuid.v4()}?api-version=2019-10-01`;
        const regex = /([^:]\/)\/+/gi;
        return url.replace(regex, '$1');
    });
}
function getWorkspaceInfoUrl(baseUrl, rgName, subId, workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        var url = `${baseUrl}/subscriptions/${subId}/resourcegroups/${rgName}/providers/Microsoft.Synapse/workspaces/${workspace}?api-version=2019-06-01-preview`;
        const regex = /([^:]\/)\/+/gi;
        return url.replace(regex, '$1');
    });
}
function checkDeploymentStatus(url, headers) {
    return __awaiter(this, void 0, void 0, function* () {
        var timeout = new Date().getTime() + (60000 * 20);
        var delayMilliSecs = 30000;
        var status = "";
        while (true) {
            var currentTime = new Date().getTime();
            if (timeout < currentTime) {
                console.log('Current time: ', currentTime);
                throw new Error("Timeout error in checkDeploymentStatus");
            }
            var res = yield client.get(url, headers);
            var resStatus = res.message.statusCode;
            console.log(`CheckDeploymentStatus: ${resStatus}; status message: ${res.message.statusMessage}`);
            if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                throw new Error(`=> status: ${resStatus}; status message: ${res.message.statusMessage}`);
            }
            var body = yield res.readBody();
            if (!body) {
                console.log("No status response for url: ", url);
                yield delay(delayMilliSecs);
                break;
            }
            let responseJson = JSON.parse(body);
            console.log(JSON.stringify(responseJson));
            status = responseJson['status'];
            if (status == 'Succeeded' || status == 'Failed' || status == 'Canceled') {
                return status;
            }
            else {
                console.log("Arm deployment status: ", status);
                yield delay(delayMilliSecs);
            }
        }
    });
}
function delay(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => setTimeout(resolve, ms));
    });
}
function deploy(armTemplate, armTemplateParameter) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var params = yield deployUtils.getParams();
            var url = yield getDeploymentUrl(params.baseUrl, params.resourceGroup, params.subscriptionId);
            console.log('Arm resources deployment url: ', url);
            var token = yield getArmAccessToken(params);
            var parameters;
            if (!!armTemplateParameter) {
                var armTemplateParameterObj = JSON.parse(armTemplateParameter);
                parameters = armTemplateParameterObj["parameters"];
            }
            return new Promise((resolve, reject) => {
                var headers = {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json; charset=utf-8'
                };
                let requestBody = `{
                "properties": {
                    "mode": "Incremental",
                    "debugSetting": {
                        "detailLevel": "requestContent, responseContent"
                    },
                    "template": ${JSON.stringify(armTemplate)}
                }
            }`;
                var timeout = new Date().getTime() + 30 * 60 * 1000;
                client.put(url, requestBody, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                    var resStatus = res.message.statusCode;
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        console.log(`Arm template deployment failed, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                        return reject(deployUtils.DeployStatus.failed);
                    }
                    console.log(`Arm template deployment status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    var statusUrl = "";
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
                    if (statusUrl != "") {
                        var status = yield checkDeploymentStatus(statusUrl, headers);
                        console.log(`Final arm deployment status: ${status}`);
                        if (status == 'Succeeded') {
                            return resolve(deployUtils.DeployStatus.success);
                        }
                        return reject(deployUtils.DeployStatus.failed);
                    }
                }), (reason) => {
                    console.log('Arm Template Deployment Failed: ', reason);
                    return reject(deployUtils.DeployStatus.failed);
                });
            });
        }
        catch (err) {
            throw new Error("ARM template deployment failed: " + err);
        }
    });
}
function getWorkspaceLocation(workspace) {
    return __awaiter(this, void 0, void 0, function* () {
        var params = yield deployUtils.getParams();
        var url = yield getWorkspaceInfoUrl(params.baseUrl, params.resourceGroup, params.subscriptionId, workspace);
        console.log('Workspace info url: ', url);
        var token = yield getArmAccessToken(params);
        var headers = {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json; charset=utf-8'
        };
        return new Promise((resolve, reject) => {
            client.get(url, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                var resStatus = res.message.statusCode;
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    console.log(`Failed to fetch workspace info, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    return reject("Failed to fetch workspace info " + res.message.statusMessage);
                }
                var body = yield res.readBody();
                if (!body) {
                    console.log("No response body for url: ", url);
                    return reject("Failed to fetch workspace info response");
                }
                let responseJson = JSON.parse(body);
                console.log("Workspace info response: " + JSON.stringify(responseJson));
                var location = responseJson['location'];
                if (!!location) {
                    console.log("Workspace location: " + location);
                    return resolve(location);
                }
                else {
                    return reject("Failed to fetch workspace location from response");
                }
            }), (reason) => {
                console.log('Failed to fetch workspace location: ', reason);
                return reject(deployUtils.DeployStatus.failed);
            });
        });
    });
}
function getArmAccessToken(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const scheme = params.authScheme.toLowerCase();
        if (scheme === 'workloadidentityfederation') {
            if (!params.tokenProvider) {
                throw new Error('Token provider was not initialized for workload identity federation.');
            }
            return params.tokenProvider.getToken(params.baseUrl);
        }
        if (!params.tokenCredentials) {
            throw new Error('Application token credentials are not available for the current authentication scheme.');
        }
        return params.tokenCredentials.getToken();
    });
}
//# sourceMappingURL=armclient.js.map