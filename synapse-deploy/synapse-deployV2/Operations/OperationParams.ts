import task = require('azure-pipelines-task-lib/task');
import {isStrNullOrEmpty} from "../CommonUtils";
import {DeployParams, ExportParams, ValidateParams} from "./OperationInterfaces";
import {ExportConstants} from "../artifacts_enum";


export function GetDeployParams(templateFile: string = "", parameterFile: string = ""): DeployParams{
    templateFile = templateFile == "" ? task.getInput("TemplateFile", true)! : templateFile;
    parameterFile = parameterFile == "" ? task.getInput("ParametersFile", true)! : parameterFile;
    let overrides = task.getInput("OverrideArmParameters", false)!;
    let workspaceName = task.getInput("TargetWorkspaceName", true)!

    let environment = task.getInput("Environment", false)!;
    if(isStrNullOrEmpty(environment)){
        environment = 'prod';
    }

    let deleteArtifacts = task.getInput("DeleteArtifactsNotInTemplate", false)!.toLowerCase() == "true"
    let deployMPE = task.getInput("DeployManagedPrivateEndpoints", false)!.toLowerCase() == "true"
    let failOnMissingOverrides = task.getInput("FailOnMissingOverrides", false)!.toLowerCase() == "true"

    return {
        templateFile: templateFile,
        parameterFile: parameterFile,
        overrides: overrides,
        environment: environment,
        deleteArtifacts: deleteArtifacts,
        deployMPE: deployMPE,
        failOnMissingOverrides: failOnMissingOverrides,
        workspaceName: workspaceName
    }
}

export function GetValidateParams(): ValidateParams{
    let artifactsFolder = task.getInput("ArtifactsFolder", true)!
    let workspaceName = task.getInput("TargetWorkspaceName", true)!

    return {
        artifactsFolder: artifactsFolder,
        workspaceName: workspaceName
    }
}

export function GetExportParams(publishArtifact: boolean): ExportParams{

    const destinationFolder: string = ExportConstants.destinationFolder;
    let artifactsFolder = task.getInput("ArtifactsFolder", true)!;
    let workspaceName = task.getInput("TargetWorkspaceName", true)!;

    return {
        artifactsFolder: artifactsFolder,
        workspaceName: workspaceName,
        destinationFolder: destinationFolder,
        publishArtifact: publishArtifact
    }
}
