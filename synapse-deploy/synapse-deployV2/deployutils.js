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
exports.DeployStatus = void 0;
exports.getAuthToken = getAuthToken;
exports.getParams = getParams;
exports.getManagedIdentityBearer = getManagedIdentityBearer;
const task = require("azure-pipelines-task-lib/task");
const armcommon = require("azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-common");
const azure_arm_endpoint_1 = require("azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-endpoint");
const ms_rest_nodeauth_1 = require("@azure/ms-rest-nodeauth");
const ms_rest_azure_env_1 = require("@azure/ms-rest-azure-env");
const artifactsclient_1 = require("./artifactsclient");
const artifacts_enum_1 = require("./artifacts_enum");
const WorkloadIdentityCredential_1 = require("./WorkloadIdentityCredential");
var DeployStatus;
(function (DeployStatus) {
    DeployStatus["success"] = "Success";
    DeployStatus["failed"] = "Failed";
    DeployStatus["skipped"] = "Skipped";
})(DeployStatus || (exports.DeployStatus = DeployStatus = {}));
function getArmEndpoint(connectedService) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new azure_arm_endpoint_1.AzureRMEndpoint(connectedService).getEndpoint();
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
        const rawScheme = safeGetEndpointAuthorizationScheme(connectedService);
        task.debug(`${connectedService} scheme via getEndpointAuthorizationScheme = ${rawScheme}`);
        if (rawScheme === "managedserviceidentity") {
            return getManagedIdentityBearer(artifactsclient_1.ArtifactClient.getAudienceUrl(environment), client);
        }
        const signals = gatherFederationSignals(connectedService);
        const wifDetection = detectWorkloadIdentityFederation(connectedService, signals);
        if (wifDetection.detected) {
            const federatedEndpoint = getFederatedEndpoint(connectedService);
            const wifCredential = new WorkloadIdentityCredential_1.WorkloadIdentityFederationCredential(federatedEndpoint, connectedService);
            return yield wifCredential.getToken(aud);
        }
        const azureEndpoint = yield getArmEndpoint(connectedService);
        const creds = azureEndpoint.applicationTokenCredentials;
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
            const signals = gatherFederationSignals(connectedService);
            const detection = detectWorkloadIdentityFederation(connectedService, signals);
            let authScheme = detection.detected ? 'WorkloadIdentityFederation' : signals.scheme;
            let credentials = undefined;
            let tokenProvider = undefined;
            let baseUrl;
            if (detection.detected) {
                const federatedEndpoint = getFederatedEndpoint(connectedService);
                tokenProvider = new WorkloadIdentityCredential_1.WorkloadIdentityFederationCredential(federatedEndpoint, connectedService);
                baseUrl = federatedEndpoint.url;
            }
            else {
                const azureEndpoint = yield getArmEndpoint(connectedService);
                authScheme = (azureEndpoint.scheme || signals.scheme || "").toString();
                credentials = azureEndpoint.applicationTokenCredentials;
                baseUrl = (credentials === null || credentials === void 0 ? void 0 : credentials.baseUrl) || azureEndpoint.url;
            }
            task.debug(`${connectedService} auth scheme = ${signals.scheme}, authenticationType = ${signals.authType}, resolved scheme = ${authScheme}`);
            var ws = task.getInput('TargetWorkspaceName', true);
            let params = {
                connectedService: connectedService,
                endpointPortalUrl: endpointPortalUrl,
                tokenCredentials: credentials,
                subscriptionId: subscriptionId,
                resourceGroup: rgName,
                authScheme: authScheme,
                workspace: ws,
                baseUrl: baseUrl,
                tokenProvider: tokenProvider
            };
            return params;
        }
        catch (err) {
            throw new Error("Failed to fetch ARM parameters: " + err);
        }
    });
}
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
function gatherFederationSignals(connectedService) {
    const rawScheme = safeGetEndpointAuthorizationScheme(connectedService);
    const authorization = tryGetEndpointAuthorization(connectedService);
    const parameters = (authorization === null || authorization === void 0 ? void 0 : authorization.parameters) || {};
    const scheme = ((authorization === null || authorization === void 0 ? void 0 : authorization.scheme) || rawScheme || '').toString();
    const authType = (parameters['authenticationType'] || parameters['authenticationtype'] || '').toString();
    const hasSecret = coerceBooleanParameter(parameters['serviceprincipalkey']);
    const hasCertificate = coerceBooleanParameter(parameters['servicePrincipalCertificate']);
    const oidcIssuer = parameters['oidcIssuer'] || parameters['oidcissuer'] || '';
    const oidcAudience = parameters['oidcAudience'] || parameters['oidcaudience'] || '';
    const workloadFlag = (task.getEndpointDataParameter(connectedService, 'WorkloadIdentityFederation', false) || '').toString();
    task.debug(`${connectedService} raw auth scheme = ${scheme}, authType = ${authType}, hasSecret = ${hasSecret}, hasCertificate = ${hasCertificate}, hasOidcIssuer = ${!!oidcIssuer}, hasOidcAudience = ${!!oidcAudience}, workloadFlag = ${workloadFlag}`);
    return {
        scheme,
        authType,
        hasSecret,
        hasCertificate,
        oidcIssuer,
        oidcAudience,
        workloadFlag
    };
}
function detectWorkloadIdentityFederation(connectedService, input) {
    const authorization = tryGetEndpointAuthorization(connectedService);
    const lowerScheme = ((authorization === null || authorization === void 0 ? void 0 : authorization.scheme) || input.scheme || '').toLowerCase();
    const parameters = (authorization === null || authorization === void 0 ? void 0 : authorization.parameters) || {};
    const paramKeys = Object.keys(parameters);
    if (paramKeys.length > 0) {
        task.debug(`${connectedService} endpoint authorization keys = [${paramKeys.join(', ')}]`);
    }
    const lowerAuthType = (parameters['authenticationType'] || parameters['authenticationtype'] || input.authType || '').toLowerCase();
    const hasSecret = input.hasSecret || !!parameters['serviceprincipalkey'];
    const hasCertificate = input.hasCertificate || !!parameters['servicePrincipalCertificate'];
    const oidcIssuer = parameters['oidcIssuer'] || parameters['oidcissuer'] || input.oidcIssuer;
    const oidcAudience = parameters['oidcAudience'] || parameters['oidcaudience'] || input.oidcAudience;
    const federatedTokenEndpoint = parameters['federatedTokenEndpoint'] || parameters['federatedtokenendpoint'];
    const workloadFlag = (task.getEndpointDataParameter(connectedService, 'WorkloadIdentityFederation', false) || input.workloadFlag || '').toLowerCase();
    const signals = [];
    if (lowerScheme === 'workloadidentityfederation') {
        signals.push('scheme');
    }
    if (lowerAuthType === 'workloadidentityfederation') {
        signals.push('authType');
    }
    if (workloadFlag === 'true') {
        signals.push('workloadFlag');
    }
    if (federatedTokenEndpoint && !hasSecret && !hasCertificate) {
        signals.push('federatedTokenEndpoint');
    }
    if (oidcIssuer && !hasSecret && !hasCertificate) {
        signals.push('oidcIssuer');
    }
    if (oidcAudience && !hasSecret && !hasCertificate) {
        signals.push('oidcAudience');
    }
    const detected = signals.length > 0;
    task.debug(`${connectedService} detection => scheme:${lowerScheme}, authType:${lowerAuthType}, hasSecret:${hasSecret}, hasCert:${hasCertificate}, oidcIssuer:${!!oidcIssuer}, oidcAudience:${!!oidcAudience}, federatedTokenEndpoint:${!!federatedTokenEndpoint}, workloadFlag:${workloadFlag}`);
    return { detected, signals };
}
function safeGetEndpointAuthorizationScheme(connectedService) {
    try {
        const scheme = task.getEndpointAuthorizationScheme(connectedService, true) || '';
        return scheme.toLowerCase();
    }
    catch (err) {
        task.debug(`${connectedService} getEndpointAuthorizationScheme threw: ${err}`);
        return '';
    }
}
function tryGetEndpointAuthorization(connectedService) {
    try {
        return task.getEndpointAuthorization(connectedService, false);
    }
    catch (err) {
        task.debug(`${connectedService} getEndpointAuthorization threw: ${err}`);
        return undefined;
    }
}
function coerceBooleanParameter(value) {
    if (value === undefined || value === null) {
        return false;
    }
    if (typeof value === 'string') {
        return value.length > 0;
    }
    return Boolean(value);
}
function getFederatedEndpoint(connectedService) {
    const url = task.getEndpointUrl(connectedService, true);
    if (!url) {
        throw new Error('Service connection is missing ARM endpoint URL.');
    }
    const servicePrincipalClientID = task.getEndpointAuthorizationParameter(connectedService, 'serviceprincipalid', false);
    if (!servicePrincipalClientID) {
        throw new Error('Service connection is missing client ID required for WIF.');
    }
    const tenantID = task.getEndpointAuthorizationParameter(connectedService, 'tenantid', false);
    if (!tenantID) {
        throw new Error('Service connection is missing tenant ID required for WIF.');
    }
    const environmentAuthorityUrl = task.getEndpointDataParameter(connectedService, 'environmentAuthorityUrl', true) || 'https://login.microsoftonline.com/';
    return {
        url,
        servicePrincipalClientID,
        tenantID,
        environmentAuthorityUrl
    };
}
//# sourceMappingURL=deployutils.js.map