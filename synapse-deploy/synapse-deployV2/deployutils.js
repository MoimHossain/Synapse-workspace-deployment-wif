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
exports.getManagedIdentityBearer = exports.getParams = exports.getAuthToken = exports.DeployStatus = void 0;
const task = require("azure-pipelines-task-lib/task");
const armcommon = require("azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-common");
const azure_arm_endpoint_1 = require("azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-endpoint");
const ms_rest_nodeauth_1 = require("@azure/ms-rest-nodeauth");
const ms_rest_azure_env_1 = require("@azure/ms-rest-azure-env");
const artifactsclient_1 = require("./artifactsclient");
const artifacts_enum_1 = require("./artifacts_enum");
var DeployStatus;
(function (DeployStatus) {
    DeployStatus["success"] = "Success";
    DeployStatus["failed"] = "Failed";
    DeployStatus["skipped"] = "Skipped";
})(DeployStatus = exports.DeployStatus || (exports.DeployStatus = {}));
function getARMCredentials(connectedService) {
    return __awaiter(this, void 0, void 0, function* () {
        var azureEndpoint = yield new azure_arm_endpoint_1.AzureRMEndpoint(connectedService).getEndpoint();
        return azureEndpoint.applicationTokenCredentials;
    });
}
function getCloudBasedOnEnvironment(env) {
    switch (env) {
        case artifactsclient_1.Env.ppe.toString():
        case artifactsclient_1.Env.prod.toString():
            return ms_rest_azure_env_1.Environment.AzureCloud;
        case artifactsclient_1.Env.mooncake.toString():
            return ms_rest_azure_env_1.Environment.ChinaCloud;
        case artifactsclient_1.Env.usnat.toString():
        case artifactsclient_1.Env.ussec.toString():
        case artifactsclient_1.Env.fairfax.toString():
            return ms_rest_azure_env_1.Environment.USGovernment;
        case artifactsclient_1.Env.blackforest.toString():
            return ms_rest_azure_env_1.Environment.GermanCloud;
        default:
            throw new Error('Cloud information based on environment could not be calculated.');
    }
}
function getAuthToken(connectedService, aud, environment, client) {
    return __awaiter(this, void 0, void 0, function* () {
        var authScheme = task.getEndpointAuthorizationScheme(connectedService, true);
        if ((authScheme === null || authScheme === void 0 ? void 0 : authScheme.toLowerCase()) == "managedserviceidentity") {
            return getManagedIdentityBearer(artifactsclient_1.ArtifactClient.getAudienceUrl(environment), client);
        }
        var azureEndpoint = yield new azure_arm_endpoint_1.AzureRMEndpoint(connectedService).getEndpoint();
        var creds = azureEndpoint.applicationTokenCredentials;
        if (azureEndpoint.servicePrincipalCertificatePath) {
            console.log("Service principal with certificate used for token generation.");
            var options = {};
            if (!options.environment) {
                options.environment = getCloudBasedOnEnvironment(environment);
                options.tokenAudience = aud;
            }
            var credsByCert = ms_rest_nodeauth_1.ApplicationTokenCertificateCredentials.create(creds.clientId, azureEndpoint.servicePrincipalCertificatePath || "", creds.domain, options);
            var tokenByCert = yield credsByCert.getToken();
            if (!tokenByCert || !tokenByCert.accessToken) {
                throw new Error("Token obtained for the service principal used is null.");
            }
            return tokenByCert.accessToken.toString();
        }
        else {
            var credsBySecret = new armcommon.ApplicationTokenCredentials(creds.clientId, creds.domain, creds.secret, aud, creds.authorityUrl, aud, false, undefined, undefined, creds.authType);
            var tokenBySecret = yield credsBySecret.getToken();
            return tokenBySecret;
        }
    });
}
exports.getAuthToken = getAuthToken;
function getParams() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            var connectedService = task.getInput("AzureResourceManagerConnection", true);
            var endpointPortalUrl = task.getEndpointDataParameter(connectedService, "armManagementPortalUrl", true);
            var scopeLevel = task.getEndpointDataParameter(connectedService, 'ScopeLevel', true);
            var subscriptionId = task.getEndpointDataParameter(connectedService, "SubscriptionId", false);
            var rgName = task.getInput('resourceGroupName', true);
            if (!!scopeLevel && scopeLevel === "Subscription") {
                var scope = task.getEndpointAuthorizationParameter(connectedService, 'scope', true);
                if (!!scope) {
                    var scopeArr = scope.split("/");
                    if (!!scopeArr[4]) {
                        rgName = scopeArr[4];
                    }
                    else {
                        throw new Error("ARM connection must be linked with resource group");
                    }
                }
            }
            var authScheme = task.getEndpointAuthorizationScheme(connectedService, true);
            var credentials = yield getARMCredentials(connectedService);
            var ws = task.getInput('TargetWorkspaceName', true);
            let params = {
                connectedService: connectedService,
                endpointPortalUrl: endpointPortalUrl,
                tokenCredentials: credentials,
                subscriptionId: subscriptionId,
                resourceGroup: rgName,
                authScheme: authScheme,
                workspace: ws
            };
            return params;
        }
        catch (err) {
            throw new Error("Failed to fetch ARM parameters: " + err);
        }
    });
}
exports.getParams = getParams;
function getManagedIdentityBearer(resourceManagerEndpointUrl, client) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return new Promise((resolve, reject) => {
                var url = `${artifacts_enum_1.DeploymentConstants.GetMSIUrl}?api-version=${artifacts_enum_1.DeploymentConstants.GetMSIAPIVersion}&resource=${resourceManagerEndpointUrl}`;
                var headers = {
                    'Metadata': 'true'
                };
                client.get(url, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                    var resStatus = res.message.statusCode;
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        console.log(`Unable to fetch managed identity bearer token, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                        let error = yield res.readBody();
                        console.log(error);
                        return reject(DeployStatus.failed);
                    }
                    console.log(`Able to fetch managed identity bearer token: ${resStatus}; status message: ${res.message.statusMessage}`);
                    let body = yield res.readBody();
                    return resolve(JSON.parse(body)["access_token"]);
                }));
            });
        }
        catch (err) {
            throw new Error("Unable to fetch the managed identity bearer token: " + err);
        }
    });
}
exports.getManagedIdentityBearer = getManagedIdentityBearer;
//# sourceMappingURL=deployutils.js.map