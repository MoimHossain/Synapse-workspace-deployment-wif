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
exports.orchestrateFromDevBranch = orchestrateFromDevBranch;
exports.orchestrateFromPublishBranch = orchestrateFromPublishBranch;
const armtemplateutils_1 = require("./armtemplateutils");
const deployutils_1 = require("./deployutils");
const armclient = __importStar(require("./armclient"));
const telemetry_1 = require("./telemetry");
const artifacts_enum_1 = require("./artifacts_enum");
const workspaceArtifactsGetter_1 = require("./workspaceArtifactsGetter");
var path = require('path');
var typeMap = new Map([
    [artifacts_enum_1.DataFactoryType.dataset.toLowerCase(), artifacts_enum_1.Artifact.dataset],
    [artifacts_enum_1.DataFactoryType.dataflow.toLowerCase(), artifacts_enum_1.Artifact.dataflow],
    [artifacts_enum_1.DataFactoryType.linkedservice.toLowerCase(), artifacts_enum_1.Artifact.linkedservice],
    [artifacts_enum_1.DataFactoryType.credential.toLowerCase(), artifacts_enum_1.Artifact.credential],
    [artifacts_enum_1.DataFactoryType.integrationruntime.toLowerCase(), artifacts_enum_1.Artifact.integrationruntime],
    [artifacts_enum_1.DataFactoryType.notebook.toLowerCase(), artifacts_enum_1.Artifact.notebook],
    [artifacts_enum_1.DataFactoryType.pipeline.toLowerCase(), artifacts_enum_1.Artifact.pipeline],
    [artifacts_enum_1.DataFactoryType.sparkjobdefinition.toLowerCase(), artifacts_enum_1.Artifact.sparkjobdefinition],
    [artifacts_enum_1.DataFactoryType.bigdatapools.toLowerCase(), artifacts_enum_1.Artifact.bigdatapools],
    [artifacts_enum_1.DataFactoryType.sqlpool.toLowerCase(), artifacts_enum_1.Artifact.sqlpool],
    [artifacts_enum_1.DataFactoryType.sqlscript.toLowerCase(), artifacts_enum_1.Artifact.sqlscript],
    [artifacts_enum_1.DataFactoryType.trigger.toLowerCase(), artifacts_enum_1.Artifact.trigger],
    [artifacts_enum_1.DataFactoryType.managedVirtualNetworks.toLowerCase(), artifacts_enum_1.Artifact.managedvirtualnetworks],
    [artifacts_enum_1.DataFactoryType.managedPrivateEndpoints.toLowerCase(), artifacts_enum_1.Artifact.managedprivateendpoints],
    [artifacts_enum_1.DataFactoryType.kqlScript.toLowerCase(), artifacts_enum_1.Artifact.kqlScript],
    [artifacts_enum_1.DataFactoryType.database.toLowerCase(), artifacts_enum_1.Artifact.database],
    [artifacts_enum_1.DataFactoryType.sparkconfiguration.toLowerCase(), artifacts_enum_1.Artifact.sparkconfiguration],
]);
function getRelativeFolderPath(repoFolderPath) {
    repoFolderPath = path.normalize(repoFolderPath);
    var defaultWorkDir = process.env["SYSTEM_DEFAULTWORKINGDIRECTORY"];
    repoFolderPath = repoFolderPath.replace(defaultWorkDir + path.sep, "");
    repoFolderPath = repoFolderPath.substring(repoFolderPath.indexOf(path.sep), repoFolderPath.length);
    repoFolderPath = repoFolderPath.split(/[\\\/]/g).join(path.posix.sep);
    return repoFolderPath;
}
function orchestrateFromDevBranch(repositoryDownloader, artifactClient, downloadPath, repositoryName, token, publishBranch, repoFolderPath, targetWorkspace, environment, client) {
    return __awaiter(this, void 0, void 0, function* () {
        var downloadStatus = yield repositoryDownloader.downloadFiles(downloadPath, token, client);
        console.log('GIT files download status', downloadStatus);
        repoFolderPath = getRelativeFolderPath(repoFolderPath);
        var files = yield repositoryDownloader.extractFiles(downloadPath + "\\", repoFolderPath);
        var dependons = new Array();
        var resources = new Array();
        for (let file of files) {
            var type = JSON.parse(file.content)['type'];
            if (!type) {
                var fileName = (file.fileName);
                console.log("filename: " + fileName);
                if (fileName.match(new RegExp(artifacts_enum_1.Artifact.notebook, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.notebook;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.sparkjobdefinition, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.sparkjobdefinition;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.sqlscript, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.sqlscript;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.dataset, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.dataset;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.pipeline, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.pipeline;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.dataflow, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.dataflow;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.integrationruntime, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.integrationruntime;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.linkedservice, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.linkedservice;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.trigger, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.trigger;
                }
                else if (fileName.match(new RegExp(artifacts_enum_1.Artifact.credential, "i"))) {
                    type = artifacts_enum_1.DataFactoryType.credential;
                }
                else {
                    console.log("Unknown artifact ");
                    continue;
                }
            }
            var resource = {
                type: type,
                isDefault: false,
                content: file.content,
                name: ``,
                dependson: dependons
            };
            resources.push(resource);
            console.log("Resources type queued: " + type);
        }
    });
}
function orchestrateFromPublishBranch(packageFileDownloader, artifactClient, targetWorkspace, environment, overrideArmParameters, deleteArtifactsNotInTemplate, deployMPE) {
    return __awaiter(this, void 0, void 0, function* () {
        var packageFilesContent = yield packageFileDownloader.getPackageFiles();
        let armTemplateContent = '';
        let armParameterContent = '';
        armParameterContent = packageFilesContent.parametersFileContent;
        armTemplateContent = packageFilesContent.templateFileContent;
        var targetLocation = '';
        try {
            targetLocation = yield armclient.getWorkspaceLocation(targetWorkspace);
        }
        catch (err) {
            throw new Error("Get workspace location error: " + err);
        }
        let canDeployMPE = yield (0, workspaceArtifactsGetter_1.SKipManagedPE)(targetWorkspace, environment);
        canDeployMPE = !canDeployMPE && deployMPE;
        var artifactsToDeploy;
        try {
            if (!armTemplateContent || !armParameterContent) {
                throw new Error('Empty file(s): ');
            }
            artifactsToDeploy = yield (0, armtemplateutils_1.getArtifacts)(armParameterContent, armTemplateContent, overrideArmParameters, targetWorkspace, targetLocation);
        }
        catch (err) {
            throw new Error('Failed to parse package: ' + err);
        }
        console.log("Start deploying artifacts from the template.");
        yield deployResourcesInOrder(artifactClient, artifactsToDeploy, targetWorkspace, environment, armParameterContent, canDeployMPE);
        console.log("Completed deploying artifacts from the template.");
        if (deleteArtifactsNotInTemplate) {
            console.log("Attempting to delete artifacts from workspace, that were not in the template.");
            var artifactsInWorkspace = yield (0, workspaceArtifactsGetter_1.getArtifactsFromWorkspace)(targetWorkspace, environment);
            console.log(`Found ${artifactsInWorkspace.length} artifacts in the workspace.`);
            var artifactsToDeleteInWorkspace = (0, workspaceArtifactsGetter_1.getArtifactsToDeleteFromWorkspace)(artifactsInWorkspace, artifactsToDeploy, typeMap);
            console.log(`Found ${artifactsToDeleteInWorkspace.length} artifacts in the workspace that many need to be deleted.`);
            var artifactsToDeleteInWorkspaceInOrder = (0, workspaceArtifactsGetter_1.getArtifactsToDeleteFromWorkspaceInOrder)(artifactsToDeleteInWorkspace);
            yield deleteResourcesInOrder(artifactClient, artifactsToDeleteInWorkspaceInOrder, targetWorkspace, environment, armParameterContent);
            var datalakeSubArtifactsToDelete = yield (0, workspaceArtifactsGetter_1.DatalakeSubArtifactsToDelete)(artifactsInWorkspace, artifactsToDeploy, targetWorkspace, environment);
            yield deleteDatalakeArtifacts(artifactClient, datalakeSubArtifactsToDelete, targetWorkspace, environment);
            console.log("Completed deleting artifacts from workspace, that were not in the template.");
        }
    });
}
function deployResourcesInOrder(artifactClient, artifactsToDeploy, targetWorkspace, environment, armParameterContent, canDeployMPE) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < artifactsToDeploy.length; i++) {
            let batchOfArtifacts = artifactsToDeploy[i];
            yield deployBatch(artifactClient, batchOfArtifacts, targetWorkspace, environment, armParameterContent, canDeployMPE);
            yield artifactClient.WaitForAllDeployments(false);
        }
    });
}
function deleteResourcesInOrder(artifactClient, artifactsToDelete, targetWorkspace, environment, armParameterContent) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < artifactsToDelete.length; i++) {
            let batchOfArtifacts = artifactsToDelete[i];
            yield deleteBatch(artifactClient, batchOfArtifacts, targetWorkspace, environment, armParameterContent);
            yield artifactClient.WaitForAllDeployments(true);
        }
    });
}
function deployBatch(artifactClient, artifactsToDeploy, targetWorkspace, environment, armParameterContent, canDeployMPE) {
    return __awaiter(this, void 0, void 0, function* () {
        var error = "";
        for (var resource of artifactsToDeploy) {
            if (resource.isDefault) {
                console.log(`Skipping deployment of ${resource.name} as its a default workspace resource.`);
                continue;
            }
            let artifactTypeToDeploy = typeMap.get(resource.type.toLowerCase());
            if (!resource.content) {
                console.log(`Empty artifactMap of type : ${resource.type} skip deployment`);
                let telemetryEntry = {
                    key: 'Empty-Content',
                    value: `Empty artifactMap of type : ${resource.type} skip deployment`
                };
                (0, telemetry_1.logTelemetry)(telemetryEntry);
                continue;
            }
            console.log(`Deploy ${resource.name} of type ${artifactTypeToDeploy}`);
            let telemetryEntry = {
                key: resource.type.toLowerCase(),
                value: `Deploy ${resource.type}`
            };
            (0, telemetry_1.logTelemetry)(telemetryEntry);
            var result;
            if (artifactTypeToDeploy == artifacts_enum_1.Artifact.sqlpool ||
                artifactTypeToDeploy == artifacts_enum_1.Artifact.bigdatapools ||
                artifactTypeToDeploy == artifacts_enum_1.Artifact.managedvirtualnetworks ||
                (!canDeployMPE && artifactTypeToDeploy == artifacts_enum_1.Artifact.managedprivateendpoints)) {
                continue;
            }
            result = yield artifactClient.deployArtifact(artifactTypeToDeploy, resource, targetWorkspace, environment);
            let deploymentStatus = {
                key: resource.type.toLowerCase(),
                value: `Deployment status : ${result}`
            };
            (0, telemetry_1.logTelemetry)(deploymentStatus);
            if (result != deployutils_1.DeployStatus.success) {
                throw new Error(`For Artifact ${resource.name}: Failure in deployment: ${result}`);
            }
        }
    });
}
function deleteBatch(artifactClient, artifactsToDelete, targetWorkspace, environment, armParameterContent) {
    return __awaiter(this, void 0, void 0, function* () {
        var error = "";
        for (var resource of artifactsToDelete) {
            if (resource.isDefault) {
                console.log(`Skipping deletion of ${resource.name} as its a default workspace resource.`);
                continue;
            }
            let artifactTypeToDelete = typeMap.get(resource.type.toLowerCase());
            console.log(`Deleting ${resource.name} of type ${artifactTypeToDelete}`);
            var result;
            if (artifactTypeToDelete == artifacts_enum_1.Artifact.sqlpool ||
                artifactTypeToDelete == artifacts_enum_1.Artifact.bigdatapools ||
                artifactTypeToDelete == artifacts_enum_1.Artifact.managedvirtualnetworks) {
                continue;
            }
            result = yield artifactClient.deleteArtifact(artifactTypeToDelete, resource, targetWorkspace, environment);
            console.log(`Deletion status : ${result}`);
            let deletionStatus = {
                key: resource.type.toLowerCase(),
                value: `Deployment status : ${result}`
            };
            (0, telemetry_1.logTelemetry)(deletionStatus);
            if (result != deployutils_1.DeployStatus.success) {
                console.log("Failure in deployment: " + result);
            }
        }
    });
}
function deleteDatalakeArtifacts(artifactClient, resources, workspace, environment) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (let resource of resources) {
                let response = yield artifactClient.deleteDatalakeChildren(resource, workspace, environment);
                if (response != deployutils_1.DeployStatus.success) {
                    throw new Error(`Artifact deletion failed : ${resource}`);
                }
            }
            console.log("Deletion successful of tables and relationships in database.");
        }
        catch (err) {
            throw new Error(`Database deletion failed : ${err}`);
        }
    });
}
//# sourceMappingURL=orchestration.js.map