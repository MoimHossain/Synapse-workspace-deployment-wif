import {OPERATIONS} from "../artifacts_enum";
import {PackageFileDownloader, PackageFiles} from "../PackageFileDownloader";
import {DeployParams, ExportParams, OperationParams, Operations, ValidateParams} from "./OperationInterfaces";
import {ArtifactClient} from "../artifactsclient";
import * as deployutils from "../deployutils";
import {GetHttpClient, isStrNullOrEmpty} from "../CommonUtils";
import {orchestrateFromPublishBranch} from "../orchestration";
import {BundleManager} from "./BundleManager";
import path from "path";


export class DeployOperation implements Operations{
    operationType: OPERATIONS = OPERATIONS.deploy;
    operationParams: DeployParams;

    constructor(operationParams: DeployParams) {
        this.operationParams = operationParams;
    }

    public async PerformOperation(): Promise<void> {
        console.log(`Starting ${this.operationType} operation`);

        if(isStrNullOrEmpty(this.operationParams.overrides) && this.operationParams.failOnMissingOverrides){
            throw new Error("Overrides not provided.");
        }

        try {
            let packageFiles: PackageFiles = {
                templateFile: this.operationParams.templateFile,
                parametersFile: this.operationParams.parameterFile
            };

            let packageFileDownloader: PackageFileDownloader = new PackageFileDownloader(packageFiles);
            let client = GetHttpClient();
            const artifactClient: ArtifactClient = new ArtifactClient(await deployutils.getParams(), client);

            await orchestrateFromPublishBranch(
                packageFileDownloader,
                artifactClient,
                this.operationParams.workspaceName,
                this.operationParams.environment,
                this.operationParams.overrides,
                this.operationParams.deleteArtifacts,
                this.operationParams.deployMPE);
        }
        catch(err){
            console.log(`${this.operationType} operation failed`);
            throw err;
        }
    }

}

export class ValidateOperation implements Operations{
    operationType: OPERATIONS = OPERATIONS.validate;
    operationParams: ValidateParams;

    constructor(operationParams: ValidateParams) {
        this.operationParams = operationParams;
    }

    public async PerformOperation(): Promise<void> {
        console.log(`Starting ${this.operationType} operation`);
        let cmd = [
            'node',
            BundleManager.defaultBundleFilePath,
            this.operationType,
            `"${this.operationParams.artifactsFolder}"`,
            this.operationParams.workspaceName
        ].join(' ');

        await BundleManager.ExecuteShellCommand(cmd);
    }
}

export class ExportOperation implements Operations{
    operationType: OPERATIONS = OPERATIONS.export;
    operationParams: ExportParams;

    constructor(operationParams: ExportParams) {
        this.operationParams = operationParams;
    }

    public async PerformOperation(): Promise<void> {
        console.log(`Starting ${this.operationType} operation`);
        let cmd = [
            'node',
            BundleManager.defaultBundleFilePath,
            this.operationType,
            `"${this.operationParams.artifactsFolder}"`,
            this.operationParams.workspaceName,
            this.operationParams.destinationFolder
        ].join(' ');

        await BundleManager.ExecuteShellCommand(cmd);

        if(this.operationParams.publishArtifact){
            console.log("Generating artifacts.")
            // Do not remove the below log. It is used to upload the artifact.
            console.log(`##vso[artifact.upload containerfolder=export;artifactname=${this.operationParams.workspaceName}]${path.join(process.cwd(),this.operationParams.destinationFolder)}`);
        }
    }
}


