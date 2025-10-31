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
exports.ArtifactClient = exports.Env = void 0;
const deployutils_1 = require("./deployutils");
const artifacts_enum_1 = require("./artifacts_enum");
const q_1 = require("q");
var Env;
(function (Env) {
    Env["ppe"] = "ppe";
    Env["prod"] = "prod";
    Env["fairfax"] = "fairfax";
    Env["mooncake"] = "mooncake";
    Env["usnat"] = "usnat";
    Env["ussec"] = "ussec";
    Env["blackforest"] = "blackforest";
})(Env = exports.Env || (exports.Env = {}));
class ArtifactClient {
    constructor(params, client) {
        this.apiVersion = 'api-version=2019-06-01-preview';
        this.symsApiVersion = 'api-version=2021-04-01';
        this.idwValidation = 'validationtype=IDWValidation';
        this.nameTag = 'name';
        this.params = params;
        this.client = client;
        this.deploymentTrackingRequests = new Array();
    }
    deployArtifact(resourceType, payload, workspace, environment) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseUrl = this.getBaseurl(workspace, environment, resourceType);
            var token = yield deployutils_1.getAuthToken(this.params.connectedService, ArtifactClient.getAudienceUrl(environment), environment, this.client);
            switch (resourceType) {
                case artifacts_enum_1.Artifact.notebook:
                    return this.deployNotebook(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.sparkjobdefinition:
                    return this.deploySparkJobDefinition(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.sqlscript:
                    return this.deploySqlScript(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.dataset:
                    return this.deployDataset(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.pipeline:
                    return this.deployPipeline(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.dataflow:
                    return this.deployDataflow(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.trigger:
                    return this.deployTrigger(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.linkedservice:
                    return this.deployLinkedservice(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.integrationruntime:
                    return this.deployIntegrationruntime(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.credential:
                    return this.deployCredential(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.kqlScript:
                    return this.deployKqlScript(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.managedprivateendpoints:
                    return this.deployManagedPrivateEndpoint(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.database:
                    return this.deployDatabase(baseUrl, payload, token);
                case artifacts_enum_1.Artifact.sparkconfiguration:
                    return this.deploySparkConfiguration(baseUrl, payload, token);
                default:
                    return deployutils_1.DeployStatus.skipped;
            }
        });
    }
    deleteArtifact(resourceType, payload, workspace, environment) {
        return __awaiter(this, void 0, void 0, function* () {
            const baseUrl = this.getBaseurl(workspace, environment, resourceType);
            var token = yield deployutils_1.getAuthToken(this.params.connectedService, ArtifactClient.getAudienceUrl(environment), environment, this.client);
            return yield this.artifactDeletionTask(baseUrl, resourceType, payload, token);
        });
    }
    deleteDatalakeChildren(resource, workspace, location) {
        return __awaiter(this, void 0, void 0, function* () {
            let url = ArtifactClient.getUrlByEnvironment(workspace, location);
            let token = yield deployutils_1.getAuthToken(this.params.connectedService, ArtifactClient.getAudienceUrl(location), location, this.client);
            url = `${url}/${resource}?${this.symsApiVersion}`;
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                this.client.del(url, this.getHeaders(token)).then((res) => {
                    var resStatus = res.message.statusCode;
                    console.log(`For Artifact: ${resource}: ArtifactDeletionTask status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        return reject(deployutils_1.DeployStatus.failed);
                    }
                    return resolve(deployutils_1.DeployStatus.success);
                });
            }));
        });
    }
    WaitForAllDeployments(isDelete) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let i = 0; i < this.deploymentTrackingRequests.length; i++) {
                let deploymentTrackingRequest = this.deploymentTrackingRequests[i];
                if (isDelete) {
                    yield this.checkStatusForDelete(deploymentTrackingRequest.url, deploymentTrackingRequest.name, deploymentTrackingRequest.token);
                }
                else {
                    yield this.checkStatus(deploymentTrackingRequest.url, deploymentTrackingRequest.name, deploymentTrackingRequest.token);
                }
            }
            while (this.deploymentTrackingRequests.length > 0) {
                this.deploymentTrackingRequests.pop();
            }
        });
    }
    getStatusUrl(baseUrl, artifactype, operationId) {
        var url = this.getCommonPath(baseUrl, artifactype);
        return url + `/operationResults/${operationId}?${this.apiVersion}`;
    }
    buildArtifactUrl(baseUrl, artifactype, artifactNameValue) {
        var url = this.getCommonPath(baseUrl, artifactype);
        while (artifactNameValue.indexOf(' ') > -1)
            artifactNameValue = artifactNameValue.replace(' ', '%20');
        if (artifactype == `${artifacts_enum_1.Artifact.managedprivateendpoints}s`) {
            return url + `/${artifacts_enum_1.Artifact.managedprivateendpoints}/${artifactNameValue}?${this.apiVersion}`;
        }
        var version = (artifactype === `${artifacts_enum_1.Artifact.database}s`) ? this.symsApiVersion : this.apiVersion;
        return url + `/${artifactype}/${artifactNameValue}?${version}`;
    }
    getCommonPath(baseUrl, artifactype) {
        var url;
        if (artifactype === `${artifacts_enum_1.Artifact.integrationruntime}s`) {
            url = `${baseUrl}/subscriptions/${this.params.subscriptionId}/resourceGroups/${this.params.resourceGroup}`;
            url = url + `/providers/Microsoft.Synapse/workspaces/${this.params.workspace}`;
        }
        else if (artifactype === artifacts_enum_1.Artifact.managedprivateendpoints || artifactype == `${artifacts_enum_1.Artifact.managedprivateendpoints}s`) {
            url = baseUrl + "/" + artifacts_enum_1.Artifact.managedvirtualnetworks + "/default";
        }
        else {
            url = `${baseUrl}`;
        }
        return url;
    }
    deployManagedPrivateEndpoint(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let payLoadJson = JSON.parse(payload.content);
                if (payLoadJson["properties"].hasOwnProperty("fqdns")) {
                    delete payLoadJson["properties"]["fqdns"];
                }
                payload.content = JSON.stringify(payLoadJson);
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.managedprivateendpoints.toString()}`, payload, token);
            }
            catch (err) {
                throw new Error("ManagedPrivateEndpoint deployment status " + JSON.stringify(err));
            }
        });
    }
    deployCredential(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.credential.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Credential deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployIntegrationruntime(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                token = yield this.params.tokenCredentials.getToken();
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.integrationruntime.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Integration runtime deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployKqlScript(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.kqlScript.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("KqlScript deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployLinkedservice(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.linkedservice.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Linked service deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployTrigger(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.trigger.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Trigger deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployDataflow(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.dataflow.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Data flow deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployPipeline(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.pipeline.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Data set deployment failed " + JSON.stringify(err));
            }
        });
    }
    deployDataset(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.dataset.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Data set deployment failed " + JSON.stringify(err));
            }
        });
    }
    deploySqlScript(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.sqlscript.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("SQL script deployment status " + JSON.stringify(err));
            }
        });
    }
    deployNotebook(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.notebook.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Notebook deployment status " + JSON.stringify(err));
            }
        });
    }
    deploySparkJobDefinition(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.sparkjobdefinition.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("SparkJobDefination deployment status " + JSON.stringify(err));
            }
        });
    }
    deployDatabase(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactsGroupDeploymentTask(baseUrl, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Database deployment failed " + JSON.stringify(err));
            }
        });
    }
    deploySparkConfiguration(baseUrl, payload, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.artifactDeploymentTask(baseUrl, `${artifacts_enum_1.Artifact.sparkconfiguration.toString()}s`, payload, token);
            }
            catch (err) {
                console.log(err);
                throw new Error("Spark Configuration deployment failed " + JSON.stringify(err));
            }
        });
    }
    artifactsGroupDeploymentTask(baseUrl, payloadObj, token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let jsonContent = JSON.parse(payloadObj.content);
                for (let ddl of jsonContent['properties']['Ddls']) {
                    let artifact = { 'properties': ddl['NewEntity'] };
                    artifact['name'] = ddl['NewEntity']['Name'];
                    artifact['type'] = ddl['NewEntity']['EntityType'];
                    delete ddl['NewEntity']['Name'];
                    delete ddl['NewEntity']['EntityType'];
                    let url = "";
                    if (artifact['type'].toLowerCase() == 'database') {
                        url = `${baseUrl}/databases/${artifact['name']}`;
                    }
                    else {
                        let type = artifact['type'].toLowerCase() + 's';
                        let dbName = artifact['properties']['Namespace']['DatabaseName'];
                        url = `${baseUrl}/databases/${dbName}/${type}/${artifact['name']}`;
                    }
                    if (artifact['type'].toLowerCase() == 'relationship') {
                        if (!artifact['properties'].hasOwnProperty('RelationshipType')) {
                            artifact['properties']['RelationshipType'] = 0;
                        }
                    }
                    url = encodeURI(url) + `?${this.symsApiVersion}`;
                    yield this.client.put(url, JSON.stringify(artifact), this.getHeaders(token)).then((res) => {
                        let resStatus = res.message.statusCode;
                        console.log(`For Artifact: ${artifact['name']} of type ${artifact['type']}: ArtifactDeploymentTask status: ${resStatus}; status message: ${res.message.statusMessage}`);
                        try {
                            if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                                res.readBody().then((body) => {
                                    if (!!body) {
                                        console.log(`For Artifact: ${artifact['name']} of type ${artifact['type']} deployment failed : ${body}`);
                                    }
                                });
                                throw new Error(deployutils_1.DeployStatus.failed);
                            }
                            console.log(`For Artifact: ${artifact['name']} of type ${artifact['type']} deployment successful.`);
                        }
                        catch (err) {
                            throw err;
                        }
                    });
                }
                ;
                return q_1.resolve(deployutils_1.DeployStatus.success);
            }
            catch (err) {
                throw err;
            }
        });
    }
    artifactDeploymentTask(baseUrl, resourceType, payloadObj, token) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var url = this.buildArtifactUrl(baseUrl, resourceType, payloadObj.name);
                var payload = payloadObj.content;
                this.client.put(url, payload, this.getHeaders(token)).then((res) => {
                    var resStatus = res.message.statusCode;
                    console.log(`For Artifact: ${payloadObj.name}: ArtifactDeploymentTask status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        res.readBody().then((body) => {
                            if (!!body) {
                                let responseJson = JSON.parse(body);
                                console.log(`For Artifact: ${payloadObj.name}: Deploy artifact failed: ${JSON.stringify(responseJson)}`);
                            }
                        });
                        return reject(deployutils_1.DeployStatus.failed);
                    }
                    var location = res.message.headers.location;
                    res.readBody().then((body) => __awaiter(this, void 0, void 0, function* () {
                        let responseJson = JSON.parse(body);
                        var operationId = responseJson['operationId'];
                        if (!!operationId) {
                            try {
                                if (!location) {
                                    location = this.getStatusUrl(baseUrl, resourceType, operationId);
                                }
                                let deploymentTrackingRequest = {
                                    url: location,
                                    name: payloadObj.name,
                                    token: token
                                };
                                this.deploymentTrackingRequests.push(deploymentTrackingRequest);
                            }
                            catch (err) {
                                console.log(`For Artifact: ${payloadObj.name}: Deployment failed with error: ${JSON.stringify(err)}`);
                                return reject(deployutils_1.DeployStatus.failed);
                            }
                            return resolve(deployutils_1.DeployStatus.success);
                        }
                        else {
                            if (resourceType == artifacts_enum_1.Artifact.managedprivateendpoints) {
                                let status = responseJson['properties']['provisioningState'];
                                if (status == "Succeeded") {
                                    return resolve(deployutils_1.DeployStatus.success);
                                }
                                if (status == "Provisioning") {
                                    let deploymentTrackingRequest = {
                                        url: url,
                                        name: payloadObj.name,
                                        token: token
                                    };
                                    this.deploymentTrackingRequests.push(deploymentTrackingRequest);
                                    return resolve(deployutils_1.DeployStatus.success);
                                }
                            }
                            return reject(deployutils_1.DeployStatus.failed);
                        }
                    }));
                }, (reason) => {
                    console.log(`For Artifact: ${payloadObj.name}: Artifact Deployment failed: ${reason}`);
                    return reject(deployutils_1.DeployStatus.failed);
                });
            }));
        });
    }
    artifactDeletionTask(baseUrl, resourceType, payloadObj, token) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                var url = this.buildArtifactUrl(baseUrl, `${resourceType}s`, payloadObj.name);
                this.client.del(url, this.getHeaders(token)).then((res) => {
                    var resStatus = res.message.statusCode;
                    console.log(`For Artifact: ${payloadObj.name}: ArtifactDeletionTask status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        return reject(deployutils_1.DeployStatus.failed);
                    }
                    if (resourceType != artifacts_enum_1.Artifact.managedprivateendpoints) {
                        var location = res.message.headers.location;
                        if (!!location) {
                            let deploymentTrackingRequest = {
                                url: location,
                                name: payloadObj.name,
                                token: token
                            };
                            this.deploymentTrackingRequests.push(deploymentTrackingRequest);
                        }
                    }
                    return resolve(deployutils_1.DeployStatus.success);
                }, (reason) => {
                    console.log("Artifact Delete failed: " + reason);
                    return reject(deployutils_1.DeployStatus.failed);
                });
            }));
        });
    }
    checkStatus(url, name, token) {
        return __awaiter(this, void 0, void 0, function* () {
            var timeout = new Date().getTime() + (60000 * 20);
            var delayMilliSecs = 30000;
            while (true) {
                var currentTime = new Date().getTime();
                if (timeout < currentTime) {
                    console.log('Current time: ', currentTime);
                    throw new Error("Timeout error in checkStatus");
                }
                var artifactName = '';
                var res = yield this.client.get(url, this.getHeaders(token));
                var resStatus = res.message.statusCode;
                console.log(`For artifact: ${name}: Checkstatus: ${resStatus}; status message: ${res.message.statusMessage}`);
                var body = yield res.readBody();
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    let msg = res.message.statusMessage;
                    let response = JSON.parse(body);
                    if (body != null && response.error != null && response.error.message != null) {
                        msg = response.error.message;
                    }
                    throw new Error(`Checkstatus => status: ${resStatus}; status message: ${msg}`);
                }
                if (!body) {
                    yield this.delay(delayMilliSecs);
                    continue;
                }
                let responseJson = JSON.parse(body);
                var status = responseJson['status'];
                if (!!status && status == 'Failed') {
                    console.log(`For artifact: ${name}: Artifact Deployment status: ${status}`);
                    throw new Error(`Failed to fetch the deployment status ${JSON.stringify(responseJson['error'])}`);
                }
                else if (!!status && (status == 'InProgress' || status == 'Accepted')) {
                    yield this.delay(delayMilliSecs);
                    continue;
                }
                artifactName = responseJson['name'];
                if (artifactName === name || status === "Succeeded") {
                    console.log(`Artifact ${name} deployed successfully.`);
                    break;
                }
                else {
                    throw new Error(`Artifact deployment validation failed : ${body}`);
                }
            }
        });
    }
    checkStatusForDelete(url, name, token) {
        return __awaiter(this, void 0, void 0, function* () {
            var timeout = new Date().getTime() + (60000 * 20);
            var delayMilliSecs = 30000;
            while (true) {
                var currentTime = new Date().getTime();
                if (timeout < currentTime) {
                    console.log('Current time: ', currentTime);
                    throw new Error("Timeout error in checkStatus");
                }
                var nbName = '';
                var res = yield this.client.get(url, this.getHeaders(token));
                var resStatus = res.message.statusCode;
                var body = yield res.readBody();
                if (body.trim() != "") {
                    let bodyObj = JSON.parse(body);
                    if (bodyObj["status"].toLowerCase() == "failed") {
                        console.log(bodyObj["error"]["message"]);
                        throw new Error(`For Artifact: ${name} deletion failed. ${JSON.stringify(bodyObj)}`);
                    }
                }
                console.log(`For Artifact: ${name}: Checkstatus: ${resStatus}; status message: ${res.message.statusMessage}`);
                if (resStatus != 200 && resStatus < 203) {
                    yield this.delay(delayMilliSecs);
                    continue;
                }
                return;
            }
        });
    }
    delay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    getHeaders(token) {
        var _a;
        var headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': (_a = this.client.userAgent) === null || _a === void 0 ? void 0 : _a.toString()
        };
        return headers;
    }
    static getAudienceUrl(env) {
        switch (env) {
            case Env.ppe.toString():
            case Env.prod.toString():
                return `https://dev.azuresynapse.net`;
            case Env.mooncake.toString():
                return `https://dev.azuresynapse.azure.cn`;
            case Env.usnat.toString():
            case Env.ussec.toString():
            case Env.fairfax.toString():
                return `https://dev.azuresynapse.usgovcloudapi.net`;
            case Env.blackforest.toString():
            default:
                throw new Error('Environment validation failed');
        }
    }
    getBaseurl(workspace, environment, resourceType) {
        switch (resourceType) {
            case artifacts_enum_1.Artifact.integrationruntime:
                return `${this.params.tokenCredentials.baseUrl}`;
            default:
                return ArtifactClient.getUrlByEnvironment(workspace, environment);
        }
    }
    static getUrlByEnvironment(workspace, environment) {
        switch (environment) {
            case Env.ppe.toString():
                return `https://${workspace}.dev.azuresynapse-dogfood.net`;
            case Env.prod.toString():
                return `https://${workspace}.dev.azuresynapse.net`;
            case Env.mooncake.toString():
                return `https://${workspace}.dev.azuresynapse.azure.cn`;
            case Env.usnat.toString():
            case Env.ussec.toString():
            case Env.fairfax.toString():
                return `https://${workspace}.dev.azuresynapse.usgovcloudapi.net`;
            case Env.blackforest.toString():
            default:
                throw new Error('Environment validation failed');
        }
    }
}
exports.ArtifactClient = ArtifactClient;
//# sourceMappingURL=artifactsclient.js.map