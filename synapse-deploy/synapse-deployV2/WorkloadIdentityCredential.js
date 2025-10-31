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
exports.WorkloadIdentityFederationCredential = void 0;
const task = require("azure-pipelines-task-lib/task");
const webapi_1 = require("azure-pipelines-tasks-artifacts-common/webapi");
const azure_devops_node_api_1 = require("azure-devops-node-api");
const HttpClient_1 = require("typed-rest-client/HttpClient");
const querystring = __importStar(require("querystring"));
const DEFAULT_AUDIENCE = 'https://management.azure.com';
const TOKEN_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
class WorkloadIdentityFederationCredential {
    constructor(endpoint, connectedService) {
        this.endpoint = endpoint;
        this.connectedService = connectedService;
        const userAgent = `synapse-cicd-deploy-task/${process.env.TASK_INSTANCE_ID || 'wif'}`;
        this.httpClient = new HttpClient_1.HttpClient(userAgent);
    }
    get baseUrl() {
        return this.endpoint.url;
    }
    getToken(audience) {
        return __awaiter(this, void 0, void 0, function* () {
            const targetAudience = this.sanitizeAudience(audience);
            const oidcToken = yield this.acquireOidcToken();
            return yield this.exchangeToken(targetAudience, oidcToken);
        });
    }
    sanitizeAudience(audience) {
        const trimmed = (audience || DEFAULT_AUDIENCE).trim();
        if (!trimmed) {
            throw new Error('Audience required for token acquisition');
        }
        return trimmed.replace(/\/$/, '');
    }
    acquireOidcToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const collectionUri = task.getVariable('System.CollectionUri');
            const projectId = task.getVariable('System.TeamProjectId');
            const planId = task.getVariable('System.PlanId');
            const jobId = task.getVariable('System.JobId');
            const hubName = task.getVariable('System.HostType');
            if (!collectionUri || !projectId || !planId || !jobId || !hubName) {
                throw new Error('Missing pipeline metadata required for OIDC token request. Ensure the task runs in Azure Pipelines with OAuth token enabled.');
            }
            const systemAccessToken = (0, webapi_1.getSystemAccessToken)();
            if (!systemAccessToken) {
                throw new Error('Unable to retrieve System.AccessToken. Enable \'Allow scripts to access the OAuth token\' for the pipeline.');
            }
            const authHandler = (0, azure_devops_node_api_1.getHandlerFromToken)(systemAccessToken);
            const connection = new azure_devops_node_api_1.WebApi(collectionUri, authHandler, { keepAlive: true });
            const taskApi = yield connection.getTaskApi();
            const response = yield taskApi.createOidcToken({}, projectId, hubName, planId, jobId, this.connectedService);
            const oidcToken = response === null || response === void 0 ? void 0 : response.oidcToken;
            if (!oidcToken) {
                throw new Error('Azure DevOps did not return an OIDC token for the service connection.');
            }
            return oidcToken;
        });
    }
    exchangeToken(audience, oidcToken) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenEndpoint = this.getTokenEndpoint();
            const requestBody = querystring.stringify({
                client_id: this.endpoint.servicePrincipalClientID,
                client_assertion_type: TOKEN_TYPE,
                client_assertion: oidcToken,
                scope: `${audience}/.default`,
                grant_type: 'client_credentials'
            });
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            const response = yield this.httpClient.post(tokenEndpoint, requestBody, headers);
            const statusCode = response.message.statusCode || 0;
            const responseBody = yield response.readBody();
            if (statusCode < 200 || statusCode >= 300) {
                throw new Error(`Unable to exchange OIDC token for access token. Status: ${statusCode}. Body: ${responseBody}`);
            }
            try {
                const parsed = JSON.parse(responseBody);
                const accessToken = parsed === null || parsed === void 0 ? void 0 : parsed.access_token;
                if (!accessToken) {
                    throw new Error('Token response missing access_token field.');
                }
                return accessToken;
            }
            catch (err) {
                throw new Error(`Failed to parse token response: ${err}`);
            }
        });
    }
    getTokenEndpoint() {
        const authorityUrl = (this.endpoint.environmentAuthorityUrl || 'https://login.microsoftonline.com/').replace(/\/$/, '');
        const tenantId = this.endpoint.tenantID;
        if (!tenantId) {
            throw new Error('Service connection is missing tenant information required for WIF token exchange.');
        }
        return `${authorityUrl}/${tenantId}/oauth2/v2.0/token`;
    }
}
exports.WorkloadIdentityFederationCredential = WorkloadIdentityFederationCredential;
//# sourceMappingURL=WorkloadIdentityCredential.js.map