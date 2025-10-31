"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetDeployParams = GetDeployParams;
exports.GetValidateParams = GetValidateParams;
exports.GetExportParams = GetExportParams;
const task = require("azure-pipelines-task-lib/task");
const CommonUtils_1 = require("../CommonUtils");
const artifacts_enum_1 = require("../artifacts_enum");
function GetDeployParams(templateFile = "", parameterFile = "") {
    templateFile = templateFile == "" ? task.getInput("TemplateFile", true) : templateFile;
    parameterFile = parameterFile == "" ? task.getInput("ParametersFile", true) : parameterFile;
    let overrides = task.getInput("OverrideArmParameters", false);
    let workspaceName = task.getInput("TargetWorkspaceName", true);
    let environment = task.getInput("Environment", false);
    if ((0, CommonUtils_1.isStrNullOrEmpty)(environment)) {
        environment = 'prod';
    }
    let deleteArtifacts = task.getInput("DeleteArtifactsNotInTemplate", false).toLowerCase() == "true";
    let deployMPE = task.getInput("DeployManagedPrivateEndpoints", false).toLowerCase() == "true";
    let failOnMissingOverrides = task.getInput("FailOnMissingOverrides", false).toLowerCase() == "true";
    return {
        templateFile: templateFile,
        parameterFile: parameterFile,
        overrides: overrides,
        environment: environment,
        deleteArtifacts: deleteArtifacts,
        deployMPE: deployMPE,
        failOnMissingOverrides: failOnMissingOverrides,
        workspaceName: workspaceName
    };
}
function GetValidateParams() {
    let artifactsFolder = task.getInput("ArtifactsFolder", true);
    let workspaceName = task.getInput("TargetWorkspaceName", true);
    return {
        artifactsFolder: artifactsFolder,
        workspaceName: workspaceName
    };
}
function GetExportParams(publishArtifact) {
    const destinationFolder = artifacts_enum_1.ExportConstants.destinationFolder;
    let artifactsFolder = task.getInput("ArtifactsFolder", true);
    let workspaceName = task.getInput("TargetWorkspaceName", true);
    return {
        artifactsFolder: artifactsFolder,
        workspaceName: workspaceName,
        destinationFolder: destinationFolder,
        publishArtifact: publishArtifact
    };
}
//# sourceMappingURL=OperationParams.js.map