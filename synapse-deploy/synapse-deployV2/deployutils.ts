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

export enum DeployStatus {
    success = 'Success',
    failed = 'Failed',
    skipped = 'Skipped'
}

export interface Params {
    connectedService: string;
    endpointPortalUrl: string;
    tokenCredentials: armcommon.ApplicationTokenCredentials;
    subscriptionId: string;
    resourceGroup: string;
    authScheme: string;
    workspace: string
}

export type ResourceType = 'credential' | 'sqlPool' | 'bigDataPool' | 'sqlscript' | 'notebook' | 'sparkjobdefinition'
    | 'linkedService' | 'pipeline' | 'dataset' | 'trigger' | 'integrationRuntime' | 'dataflow'
    | 'managedVirtualNetworks' | 'managedPrivateEndpoints' | 'kqlScript' | 'database';

async function getARMCredentials(connectedService: string): Promise<armcommon.ApplicationTokenCredentials> {
    var azureEndpoint: AzureEndpoint = await new AzureRMEndpoint(connectedService).getEndpoint();
    return azureEndpoint.applicationTokenCredentials;
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

    var authScheme = task.getEndpointAuthorizationScheme(connectedService, true);
    if(authScheme?.toLowerCase() == "managedserviceidentity"){
        return getManagedIdentityBearer(ArtifactClient.getAudienceUrl(environment), client)
    }

    var azureEndpoint: AzureEndpoint = await new AzureRMEndpoint(connectedService).getEndpoint();
    var creds = (<any>azureEndpoint.applicationTokenCredentials);

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

        var authScheme = task.getEndpointAuthorizationScheme(connectedService, true)!;
        var credentials = await getARMCredentials(connectedService);
        var ws = task.getInput('TargetWorkspaceName', true)!;
        let params: Params = {
            connectedService: connectedService,
            endpointPortalUrl: endpointPortalUrl,
            tokenCredentials: credentials,
            subscriptionId: subscriptionId,
            resourceGroup: rgName,
            authScheme: authScheme,
            workspace: ws
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