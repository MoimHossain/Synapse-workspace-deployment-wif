import task = require('azure-pipelines-task-lib/task');
import { getSystemAccessToken } from 'azure-pipelines-tasks-artifacts-common/webapi';
import { getHandlerFromToken, WebApi } from 'azure-devops-node-api';
import { ITaskApi } from 'azure-devops-node-api/TaskApi';
import { HttpClient } from 'typed-rest-client/HttpClient';
import * as httpInterfaces from 'typed-rest-client/Interfaces';
import * as querystring from 'querystring';

export interface TokenProvider {
    baseUrl: string;
    getToken(audience?: string): Promise<string>;
}

export interface FederatedEndpoint {
    url: string;
    servicePrincipalClientID: string;
    environmentAuthorityUrl?: string;
    tenantID: string;
}

const DEFAULT_AUDIENCE = 'https://management.azure.com';
const TOKEN_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

export class WorkloadIdentityFederationCredential implements TokenProvider {
    private readonly endpoint: FederatedEndpoint;
    private readonly connectedService: string;
    private readonly httpClient: HttpClient;

    constructor(endpoint: FederatedEndpoint, connectedService: string) {
        this.endpoint = endpoint;
        this.connectedService = connectedService;
        const userAgent = `synapse-cicd-deploy-task/${process.env.TASK_INSTANCE_ID || 'wif'}`;
        this.httpClient = new HttpClient(userAgent);
    }

    public get baseUrl(): string {
        return this.endpoint.url;
    }

    public async getToken(audience?: string): Promise<string> {
        const targetAudience = this.sanitizeAudience(audience);
        const oidcToken = await this.acquireOidcToken();
        return await this.exchangeToken(targetAudience, oidcToken);
    }

    private sanitizeAudience(audience?: string): string {
        const trimmed = (audience || DEFAULT_AUDIENCE).trim();
        if (!trimmed) {
            throw new Error('Audience required for token acquisition');
        }
        return trimmed.replace(/\/$/, '');
    }

    private async acquireOidcToken(): Promise<string> {
        const collectionUri = task.getVariable('System.CollectionUri');
        const projectId = task.getVariable('System.TeamProjectId');
        const planId = task.getVariable('System.PlanId');
        const jobId = task.getVariable('System.JobId');
        const hubName = task.getVariable('System.HostType');

        if (!collectionUri || !projectId || !planId || !jobId || !hubName) {
            throw new Error('Missing pipeline metadata required for OIDC token request. Ensure the task runs in Azure Pipelines with OAuth token enabled.');
        }

        const systemAccessToken = getSystemAccessToken();
        if (!systemAccessToken) {
            throw new Error('Unable to retrieve System.AccessToken. Enable \'Allow scripts to access the OAuth token\' for the pipeline.');
        }

        const authHandler = getHandlerFromToken(systemAccessToken);
        const connection = new WebApi(collectionUri, authHandler, { keepAlive: true });
        const taskApi: ITaskApi = await connection.getTaskApi();
        const response = await taskApi.createOidcToken({}, projectId, hubName, planId, jobId, this.connectedService);
        const oidcToken = response?.oidcToken;

        if (!oidcToken) {
            throw new Error('Azure DevOps did not return an OIDC token for the service connection.');
        }

        return oidcToken;
    }

    private async exchangeToken(audience: string, oidcToken: string): Promise<string> {
        const tokenEndpoint = this.getTokenEndpoint();
        const requestBody = querystring.stringify({
            client_id: this.endpoint.servicePrincipalClientID,
            client_assertion_type: TOKEN_TYPE,
            client_assertion: oidcToken,
            scope: `${audience}/.default`,
            grant_type: 'client_credentials'
        });

        const headers: httpInterfaces.IHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };

        const response = await this.httpClient.post(tokenEndpoint, requestBody, headers);
        const statusCode = response.message.statusCode || 0;
        const responseBody = await response.readBody();

        if (statusCode < 200 || statusCode >= 300) {
            throw new Error(`Unable to exchange OIDC token for access token. Status: ${statusCode}. Body: ${responseBody}`);
        }

        try {
            const parsed = JSON.parse(responseBody);
            const accessToken = parsed?.access_token;
            if (!accessToken) {
                throw new Error('Token response missing access_token field.');
            }
            return accessToken;
        } catch (err) {
            throw new Error(`Failed to parse token response: ${err}`);
        }
    }

    private getTokenEndpoint(): string {
        const authorityUrl = (this.endpoint.environmentAuthorityUrl || 'https://login.microsoftonline.com/').replace(/\/$/, '');
        const tenantId = this.endpoint.tenantID;
        if (!tenantId) {
            throw new Error('Service connection is missing tenant information required for WIF token exchange.');
        }

        return `${authorityUrl}/${tenantId}/oauth2/v2.0/token`;
    }
}
