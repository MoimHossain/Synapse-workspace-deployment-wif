import { ArtifactClient, Env } from "./artifactsclient";
import { getArtifacts, Resource } from "./armtemplateutils";
import { DeployStatus } from './deployutils';
import * as armclient from './armclient';
import { logTelemetry } from "./telemetry";
import { RepositoryFile, RepositoryDownloader } from "./RepositoryDownloader";
import { PackageFilesContent, PackageFileDownloader} from './PackageFileDownloader';
import * as httpClient from 'typed-rest-client/HttpClient';
import {Artifact, DataFactoryType} from "./artifacts_enum";
import {
    DatalakeSubArtifactsToDelete,
    getArtifactsFromWorkspace,
    getArtifactsToDeleteFromWorkspace,
    getArtifactsToDeleteFromWorkspaceInOrder,
    SKipManagedPE
} from "./workspaceArtifactsGetter";
import { delay } from "q";

var path = require('path');

var typeMap = new Map<string, Artifact>([
    [DataFactoryType.dataset.toLowerCase(), Artifact.dataset],
    [DataFactoryType.dataflow.toLowerCase(), Artifact.dataflow],
    [DataFactoryType.linkedservice.toLowerCase(), Artifact.linkedservice],
    [DataFactoryType.credential.toLowerCase(), Artifact.credential],
    [DataFactoryType.integrationruntime.toLowerCase(), Artifact.integrationruntime],
    [DataFactoryType.notebook.toLowerCase(), Artifact.notebook],
    [DataFactoryType.pipeline.toLowerCase(), Artifact.pipeline],
    [DataFactoryType.sparkjobdefinition.toLowerCase(), Artifact.sparkjobdefinition],
    [DataFactoryType.bigdatapools.toLowerCase(), Artifact.bigdatapools],
    [DataFactoryType.sqlpool.toLowerCase(), Artifact.sqlpool],
    [DataFactoryType.sqlscript.toLowerCase(), Artifact.sqlscript],
    [DataFactoryType.trigger.toLowerCase(), Artifact.trigger],
    [DataFactoryType.managedVirtualNetworks.toLowerCase(), Artifact.managedvirtualnetworks],
    [DataFactoryType.managedPrivateEndpoints.toLowerCase(), Artifact.managedprivateendpoints],
    [DataFactoryType.kqlScript.toLowerCase(), Artifact.kqlScript],
    [DataFactoryType.database.toLowerCase(), Artifact.database],
    [DataFactoryType.sparkconfiguration.toLowerCase(), Artifact.sparkconfiguration],
]);

function getRelativeFolderPath(repoFolderPath : string) : string {
    // Relative path of alias e.g: D:\a\r1\a\alias\<folder tree path>
    repoFolderPath = path.normalize(repoFolderPath);
    var defaultWorkDir: string = process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"]!;
    repoFolderPath = repoFolderPath.replace(defaultWorkDir + path.sep, "");

    // Relative path of folder
    repoFolderPath = repoFolderPath.substring(repoFolderPath.indexOf(path.sep), repoFolderPath.length);

    repoFolderPath = repoFolderPath.split(/[\\\/]/g).join(path.posix.sep);
    return repoFolderPath;
}

export async function orchestrateFromDevBranch(
    repositoryDownloader: RepositoryDownloader,
    artifactClient: ArtifactClient,
    downloadPath: string,
    repositoryName: string,
    token: string,
    publishBranch: string,
    repoFolderPath: string,
    targetWorkspace: string,
    environment: string,
    client: httpClient.HttpClient) {

    var downloadStatus = await repositoryDownloader.downloadFiles(downloadPath, token, client);
    console.log('GIT files download status', downloadStatus);
    repoFolderPath = getRelativeFolderPath(repoFolderPath);
    var files: RepositoryFile[] = await repositoryDownloader.extractFiles(downloadPath + "\\", repoFolderPath);

    var dependons: Array<string> = new Array<string>();
    var resources: Resource[] = new Array<Resource>();
    for (let file of files) {
        var type: string = JSON.parse(file.content)['type'];
        if (!type) {
            var fileName: string = (<string>(file.fileName));
            console.log("filename: " + fileName);
            if (fileName.match(new RegExp(Artifact.notebook, "i"))) {
                type = DataFactoryType.notebook;
            } else if (fileName.match(new RegExp(Artifact.sparkjobdefinition ,"i"))) {
                type = DataFactoryType.sparkjobdefinition;
            } else if (fileName.match(new RegExp(Artifact.sqlscript, "i"))) {
                type = DataFactoryType.sqlscript;
            } else if (fileName.match(new RegExp(Artifact.dataset, "i"))) {
                type = DataFactoryType.dataset;
            } else if (fileName.match(new RegExp(Artifact.pipeline, "i"))) {
                type = DataFactoryType.pipeline;
            } else if (fileName.match(new RegExp(Artifact.dataflow, "i"))) {
                type = DataFactoryType.dataflow;
            } else if (fileName.match(new RegExp(Artifact.integrationruntime, "i"))) {
                type = DataFactoryType.integrationruntime;
            } else if (fileName.match(new RegExp(Artifact.linkedservice, "i"))) {
                type = DataFactoryType.linkedservice;
            } else if (fileName.match(new RegExp(Artifact.trigger, "i"))) {
                type = DataFactoryType.trigger;
            } else if (fileName.match(new RegExp(Artifact.credential, "i"))) {
                type = DataFactoryType.credential;
            } else {
                console.log("Unknown artifact ");
                continue;
            }
        }
        var resource: Resource = {
            type: type,
            isDefault: false,
            content: file.content,
            name: ``,
            dependson: dependons
        };
        resources.push(resource);
        console.log("Resources type queued: " + type);
    }

    // Deploy resources In order
    // await deployResourcesInOrder(artifactClient, resources, targetWorkspace, environment, "");
}

export async function orchestrateFromPublishBranch(
    packageFileDownloader: PackageFileDownloader,
    artifactClient: ArtifactClient,
    targetWorkspace: string,
    environment: string,
    overrideArmParameters: string,
    deleteArtifactsNotInTemplate: boolean,
    deployMPE: boolean) {

    var packageFilesContent: PackageFilesContent = await packageFileDownloader.getPackageFiles();

    let armTemplateContent = '';
    let armParameterContent = '';
    armParameterContent = packageFilesContent.parametersFileContent;
    armTemplateContent = packageFilesContent.templateFileContent;

    var targetLocation = '';
    try {
        targetLocation = await armclient.getWorkspaceLocation(targetWorkspace);
    } catch (err) {
        throw new Error("Get workspace location error: " + err);
    }

    let canDeployMPE =  await SKipManagedPE(targetWorkspace, environment);
    canDeployMPE = !canDeployMPE && deployMPE;

    var artifactsToDeploy: Resource[][];
    try {
        if (!armTemplateContent || !armParameterContent) {
            throw new Error('Empty file(s): ');
        }
        artifactsToDeploy = await getArtifacts(
            armParameterContent,
            armTemplateContent,
            overrideArmParameters,
            targetWorkspace,
            targetLocation);
    } catch (err) {
        throw new Error('Failed to parse package: ' + err);
    }

    // Deploy resources In order
    console.log("Start deploying artifacts from the template.");
    await deployResourcesInOrder(artifactClient, artifactsToDeploy!, targetWorkspace, environment, armParameterContent, canDeployMPE);
    console.log("Completed deploying artifacts from the template.");

    if(deleteArtifactsNotInTemplate)
    {
        // Delete extra artifacts in the workspace
        console.log("Attempting to delete artifacts from workspace, that were not in the template.");
        var artifactsInWorkspace = await getArtifactsFromWorkspace(targetWorkspace, environment);
        console.log(`Found ${artifactsInWorkspace.length} artifacts in the workspace.`);
        var artifactsToDeleteInWorkspace = getArtifactsToDeleteFromWorkspace(artifactsInWorkspace, artifactsToDeploy, typeMap);
        console.log(`Found ${artifactsToDeleteInWorkspace.length} artifacts in the workspace that many need to be deleted.`);
        var artifactsToDeleteInWorkspaceInOrder = getArtifactsToDeleteFromWorkspaceInOrder(artifactsToDeleteInWorkspace);
        await deleteResourcesInOrder(artifactClient, artifactsToDeleteInWorkspaceInOrder!, targetWorkspace, environment, armParameterContent);

        var datalakeSubArtifactsToDelete = await DatalakeSubArtifactsToDelete(artifactsInWorkspace, artifactsToDeploy, targetWorkspace, environment);
        await deleteDatalakeArtifacts(artifactClient, datalakeSubArtifactsToDelete, targetWorkspace, environment);
        console.log("Completed deleting artifacts from workspace, that were not in the template.");
    }
}

async function deployResourcesInOrder(artifactClient: ArtifactClient, artifactsToDeploy: Resource[][],
                                      targetWorkspace: string, environment: string, armParameterContent: string, canDeployMPE: boolean) {
    for(let i=0;i<artifactsToDeploy.length;i++){
        let batchOfArtifacts = artifactsToDeploy[i];
        await deployBatch(artifactClient, batchOfArtifacts,targetWorkspace, environment,armParameterContent, canDeployMPE);
        await artifactClient.WaitForAllDeployments(false);
    }
}

async function deleteResourcesInOrder(artifactClient: ArtifactClient, artifactsToDelete: Resource[][],
                                      targetWorkspace: string, environment: string, armParameterContent: string) {
    for(let i=0;i<artifactsToDelete.length;i++){
        let batchOfArtifacts = artifactsToDelete[i];
        await deleteBatch(artifactClient, batchOfArtifacts,targetWorkspace, environment,armParameterContent);
        await artifactClient.WaitForAllDeployments(true);
    }
}

async function deployBatch(
    artifactClient: ArtifactClient,
    artifactsToDeploy: Resource[],
    targetWorkspace: string,
    environment: string,
    armParameterContent: string,
    canDeployMPE: boolean) {

    var error: string = "";

    for (var resource of artifactsToDeploy) {
        if(resource.isDefault)
        {
            console.log(`Skipping deployment of ${resource.name} as its a default workspace resource.`);
            continue;
        }

        let artifactTypeToDeploy: string = typeMap.get(resource.type.toLowerCase())!;
        if (!resource.content) {
            console.log(`Empty artifactMap of type : ${resource.type} skip deployment`);

            let telemetryEntry = {
                key: 'Empty-Content',
                value: `Empty artifactMap of type : ${resource.type} skip deployment`
            };
            logTelemetry(telemetryEntry);
            continue;
        }

        console.log(`Deploy ${resource.name} of type ${artifactTypeToDeploy}`);

        let telemetryEntry = {
            key: resource.type.toLowerCase(),
            value: `Deploy ${resource.type}`
        };
        logTelemetry(telemetryEntry);
        var result : string;
        if (artifactTypeToDeploy == Artifact.sqlpool ||
            artifactTypeToDeploy == Artifact.bigdatapools ||
            artifactTypeToDeploy == Artifact.managedvirtualnetworks||
            (!canDeployMPE && artifactTypeToDeploy == Artifact.managedprivateendpoints)) {
            // Skip this.
            continue;
        }

        // Do the artifact deployment
        result = await artifactClient.deployArtifact(artifactTypeToDeploy, resource, targetWorkspace, environment);
        let deploymentStatus = {
            key: resource.type.toLowerCase(),
            value: `Deployment status : ${result}`
        };
        logTelemetry(deploymentStatus);

        if (result != DeployStatus.success) {
            throw new Error(`For Artifact ${resource.name}: Failure in deployment: ${result}`);
        }
    }
}

async function deleteBatch(
    artifactClient: ArtifactClient,
    artifactsToDelete: Resource[],
    targetWorkspace: string,
    environment: string,
    armParameterContent: string) {

    var error: string = "";
    for (var resource of artifactsToDelete) {
        if(resource.isDefault)
        {
            console.log(`Skipping deletion of ${resource.name} as its a default workspace resource.`);
            continue;
        }

        let artifactTypeToDelete: string = typeMap.get(resource.type.toLowerCase())!;
        console.log(`Deleting ${resource.name} of type ${artifactTypeToDelete}`);

        var result : string;
        if (artifactTypeToDelete == Artifact.sqlpool ||
            artifactTypeToDelete == Artifact.bigdatapools ||
            artifactTypeToDelete == Artifact.managedvirtualnetworks) {
            // Skip this.
            continue;
        }

        // Do the artifact deletion
        result = await artifactClient.deleteArtifact(artifactTypeToDelete, resource, targetWorkspace, environment);
        console.log(`Deletion status : ${result}`);
        let deletionStatus = {
            key: resource.type.toLowerCase(),
            value: `Deployment status : ${result}`
        };
        logTelemetry(deletionStatus);

        if (result != DeployStatus.success) {
            // If deletion is not a success, its ok. we move forward.
            console.log("Failure in deployment: " + result);
        }
    }
}

async function deleteDatalakeArtifacts(artifactClient: ArtifactClient, resources: string[], workspace: string, environment: string) {
    try {
        for (let resource of resources) {
            let response = await artifactClient.deleteDatalakeChildren(resource, workspace, environment);
            if (response != DeployStatus.success) {
                throw new Error(`Artifact deletion failed : ${resource}`);
            }
        }

        console.log("Deletion successful of tables and relationships in database.");
    } catch (err) {
        throw new Error(`Database deletion failed : ${err}`);
    }
}