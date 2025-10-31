import task = require('azure-pipelines-task-lib/task');
import { AzureEndpoint } from 'azure-pipelines-tasks-azure-arm-rest-v2/azureModels';
import armcommon = require('azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-common');
import { AzureRMEndpoint } from 'azure-pipelines-tasks-azure-arm-rest-v2/azure-arm-endpoint';
import { ApplicationTokenCertificateCredentials, AzureTokenCredentialsOptions } from '@azure/ms-rest-nodeauth';
import { Environment } from "@azure/ms-rest-azure-env";
import {ArtifactClient, Env} from './artifactsclient';
import * as httpClient from "typed-rest-client/HttpClient";
import * as httpInterfaces from 'typed-rest-client/Interfaces';
import {DeploymentConstants} from "./artifacts_enum";
import { FederatedEndpoint, TokenProvider, WorkloadIdentityFederationCredential } from './WorkloadIdentityCredential';

export enum DeployStatus {
    success = 'Success',
    failed = 'Failed',
    skipped = 'Skipped'
}

export interface Params {
    connectedService: string;
    endpointPortalUrl: string;
    tokenCredentials?: armcommon.ApplicationTokenCredentials;
    subscriptionId: string;
    resourceGroup: string;
    authScheme: string;
    workspace: string;
    baseUrl: string;
    tokenProvider?: TokenProvider;
}

export type ResourceType = 'credential' | 'sqlPool' | 'bigDataPool' | 'sqlscript' | 'notebook' | 'sparkjobdefinition'
    | 'linkedService' | 'pipeline' | 'dataset' | 'trigger' | 'integrationRuntime' | 'dataflow'
    | 'managedVirtualNetworks' | 'managedPrivateEndpoints' | 'kqlScript' | 'database';

async function getArmEndpoint(connectedService: string): Promise<AzureEndpoint> {
    return await new AzureRMEndpoint(connectedService).getEndpoint();
}

function getCloudBasedOnEnvironment(env: string): Environment
{
    switch (env) {
        case Env.ppe.toString():
        case Env.prod.toString():
            return Environment.AzureCloud;
        case Env.mooncake.toString():
            return Environment.ChinaCloud;
        case Env.usnat.toString():
        case Env.ussec.toString():
        case Env.fairfax.toString():
            return Environment.USGovernment;
        case Env.blackforest.toString():
            return Environment.GermanCloud;
        default:
            throw new Error('Cloud information based on environment could not be calculated.');
    }
}

export async function getAuthToken(connectedService: string, aud: string, environment: string, client: httpClient.HttpClient): Promise<string> {
    const rawScheme = safeGetEndpointAuthorizationScheme(connectedService);
    task.debug(`${connectedService} scheme via getEndpointAuthorizationScheme = ${rawScheme}`);

    if (rawScheme === "managedserviceidentity") {
        return getManagedIdentityBearer(ArtifactClient.getAudienceUrl(environment), client);
    }

    const signals = gatherFederationSignals(connectedService);
    const wifDetection = detectWorkloadIdentityFederation(connectedService, signals);

    if (wifDetection.detected) {
        const federatedEndpoint = getFederatedEndpoint(connectedService);
        const wifCredential = new WorkloadIdentityFederationCredential(federatedEndpoint, connectedService);
        return await wifCredential.getToken(aud);
    }

    const azureEndpoint: AzureEndpoint = await getArmEndpoint(connectedService);

    const creds = (<any>azureEndpoint.applicationTokenCredentials);

    if (azureEndpoint.servicePrincipalCertificatePath)
    {
        console.log("Service principal with certificate used for token generation.")
        var options: AzureTokenCredentialsOptions = {};
        if (!options.environment) {
            options.environment = getCloudBasedOnEnvironment(environment);
            options.tokenAudience = aud;
        }

        var credsByCert = ApplicationTokenCertificateCredentials.create(
            creds.clientId,
            azureEndpoint.servicePrincipalCertificatePath || "",
            creds.domain, options );

        var tokenByCert = await credsByCert.getToken();
        if(!tokenByCert || !tokenByCert.accessToken)
        {
            throw new Error("Token obtained for the service principal used is null.");
        }

        return tokenByCert.accessToken.toString();
    }
    else
    {
        var credsBySecret = new armcommon.ApplicationTokenCredentials(
            creds.clientId,
            creds.domain,
            creds.secret,
            aud,
            creds.authorityUrl,
            aud,
            false,
            undefined,
            undefined,
            creds.authType);
        var tokenBySecret = await credsBySecret.getToken()!;
        return tokenBySecret;
    }
}

export async function getParams(): Promise<Params> {
    try {
        var connectedService = task.getInput("AzureResourceManagerConnection", true)!;
        var endpointPortalUrl = task.getEndpointDataParameter(connectedService, "armManagementPortalUrl", true)!;
        var scopeLevel = task.getEndpointDataParameter(connectedService, 'ScopeLevel', true);
        var subscriptionId = task.getEndpointDataParameter(connectedService, "SubscriptionId", false)!;
        var rgName = task.getInput('resourceGroupName', true)!;
        if (!!scopeLevel && scopeLevel === "Subscription") {
            var scope = task.getEndpointAuthorizationParameter(connectedService,
                'scope', true);
            if (!!scope) {
                var scopeArr = scope.split("/");
                if (!!scopeArr[4]) {
                    rgName = scopeArr[4];
                } else {
                    throw new Error("ARM connection must be linked with resource group");
                }
            }
        }

        const signals = gatherFederationSignals(connectedService);
        const detection = detectWorkloadIdentityFederation(connectedService, signals);

    let authScheme = detection.detected ? 'WorkloadIdentityFederation' : signals.scheme;
        let credentials: armcommon.ApplicationTokenCredentials | undefined = undefined;
        let tokenProvider: TokenProvider | undefined = undefined;
        let baseUrl: string;

        if (detection.detected) {
            const federatedEndpoint = getFederatedEndpoint(connectedService);
            tokenProvider = new WorkloadIdentityFederationCredential(federatedEndpoint, connectedService);
            baseUrl = federatedEndpoint.url;
        } else {
            const azureEndpoint = await getArmEndpoint(connectedService);
            authScheme = (azureEndpoint.scheme || signals.scheme || "").toString();
            credentials = azureEndpoint.applicationTokenCredentials;
            baseUrl = credentials?.baseUrl || azureEndpoint.url;
        }

    task.debug(`${connectedService} auth scheme = ${signals.scheme}, authenticationType = ${signals.authType}, resolved scheme = ${authScheme}`);

        var ws = task.getInput('TargetWorkspaceName', true)!;
        let params: Params = {
            connectedService: connectedService,
            endpointPortalUrl: endpointPortalUrl,
            tokenCredentials: credentials,
            subscriptionId: subscriptionId,
            resourceGroup: rgName,
            authScheme: authScheme,
            workspace: ws,
            baseUrl: baseUrl,
            tokenProvider: tokenProvider
        }
        return params;
    } catch (err) {
        throw new Error("Failed to fetch ARM parameters: " + err);
    }
}

export async function getManagedIdentityBearer(resourceManagerEndpointUrl: string, client: httpClient.HttpClient): Promise<string> {
    try {
        return new Promise<string>((resolve, reject) => {
            var url = `${DeploymentConstants.GetMSIUrl}?api-version=${DeploymentConstants.GetMSIAPIVersion}&resource=${resourceManagerEndpointUrl}`;
            var headers: httpInterfaces.IHeaders = {
                'Metadata': 'true'
            }
            client.get(url, headers).then(async (res) => {
                var resStatus = res.message.statusCode;
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    console.log(`Unable to fetch managed identity bearer token, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                    let error = await res.readBody();
                    console.log(error);
                    return reject(DeployStatus.failed);
                }
                console.log(`Able to fetch managed identity bearer token: ${resStatus}; status message: ${res.message.statusMessage}`);
                let body = await res.readBody();
                return resolve(JSON.parse(body)["access_token"]);
            });
        });
    } catch (err) {
        throw new Error("Unable to fetch the managed identity bearer token: " + err);
    }
}

interface FederationSignalsInput {
    scheme: string;
    authType: string;
    hasSecret: boolean;
    hasCertificate: boolean;
    oidcIssuer: string;
    oidcAudience: string;
    workloadFlag: string;
}

function gatherFederationSignals(connectedService: string): FederationSignalsInput {
    const rawScheme = safeGetEndpointAuthorizationScheme(connectedService);
    const authorization = tryGetEndpointAuthorization(connectedService);
    const parameters = authorization?.parameters || {};

    const scheme = (authorization?.scheme || rawScheme || '').toString();
    const authType = (parameters['authenticationType'] || parameters['authenticationtype'] || '').toString();
    const hasSecret = coerceBooleanParameter(parameters['serviceprincipalkey']);
    const hasCertificate = coerceBooleanParameter(parameters['servicePrincipalCertificate']);
    const oidcIssuer = parameters['oidcIssuer'] || parameters['oidcissuer'] || '';
    const oidcAudience = parameters['oidcAudience'] || parameters['oidcaudience'] || '';
    const workloadFlag = (tryGetEndpointDataParameter(connectedService, 'WorkloadIdentityFederation') || '').toString();

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

function detectWorkloadIdentityFederation(connectedService: string, input: FederationSignalsInput): { detected: boolean; signals: string[] } {
    const authorization = tryGetEndpointAuthorization(connectedService);
    const lowerScheme = (authorization?.scheme || input.scheme || '').toLowerCase();
    const parameters = authorization?.parameters || {};
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
    const workloadFlag = (tryGetEndpointDataParameter(connectedService, 'WorkloadIdentityFederation') || input.workloadFlag || '').toLowerCase();

    const signals: string[] = [];
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

function safeGetEndpointAuthorizationScheme(connectedService: string): string {
    try {
        const scheme = task.getEndpointAuthorizationScheme(connectedService, true) || '';
        return scheme.toLowerCase();
    } catch (err) {
        task.debug(`${connectedService} getEndpointAuthorizationScheme threw: ${err}`);
        return '';
    }
}

function tryGetEndpointAuthorization(connectedService: string) {
    try {
        return task.getEndpointAuthorization(connectedService, false);
    } catch (err) {
        task.debug(`${connectedService} getEndpointAuthorization threw: ${err}`);
        return undefined;
    }
}

function tryGetEndpointDataParameter(connectedService: string, parameterName: string): string | undefined {
    try {
        return task.getEndpointDataParameter(connectedService, parameterName, true);
    } catch (err) {
        task.debug(`${connectedService} getEndpointDataParameter(${parameterName}) threw: ${err}`);
        return undefined;
    }
}

function coerceBooleanParameter(value: any): boolean {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value === 'string') {
        return value.length > 0;
    }

    return Boolean(value);
}

function getFederatedEndpoint(connectedService: string): FederatedEndpoint {
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