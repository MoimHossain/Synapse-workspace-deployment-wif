import {GetDeployParams, GetExportParams} from "../Operations/OperationParams";

const chai_object = require('chai');
const expect = chai_object.expect;
const assert = chai_object.assert;
const sinon = require("sinon");
import task = require('azure-pipelines-task-lib/task');
import {ExportConstants} from "../artifacts_enum";

describe("Operations", () => {

    it('should get deploy params for deploy', async() => {
        let stubbedSPAttributes = sinon.stub(task, "getInput").callsFake((x: any) => { return x === "Environment" ? "prod" : x });
        let params = GetDeployParams();
        expect(params.templateFile).to.be.equal('TemplateFile');
        expect(params.parameterFile).to.be.equal('ParametersFile');
        expect(params.overrides).to.be.equal('OverrideArmParameters');
        expect(params.environment).to.be.equal('prod');
        expect(params.deleteArtifacts).to.be.equal(false);
        expect(params.deployMPE).to.be.equal(false);
        expect(params.failOnMissingOverrides).to.be.equal(false);
        expect(params.workspaceName).to.be.equal('TargetWorkspaceName');
    });

    it('should get deploy params for validate and deploy', async() => {
        let stubbedSPAttributes = sinon.stub(task, "getInput").callsFake((x: any) => { return x === "Environment" ? "prod" : x });
        let params = GetDeployParams('deployFile', 'deployparam');

        expect(params.templateFile).to.be.equal('deployFile');
        expect(params.parameterFile).to.be.equal('deployparam');
        expect(params.overrides).to.be.equal('OverrideArmParameters');
        expect(params.environment).to.be.equal('prod');
        expect(params.deleteArtifacts).to.be.equal(false);
        expect(params.deployMPE).to.be.equal(false);
        expect(params.failOnMissingOverrides).to.be.equal(false);
        expect(params.workspaceName).to.be.equal('TargetWorkspaceName');
    });

    it('should get export params for validate', async() => {
        let stubbedSPAttributes = sinon.stub(task, "getInput").callsFake((x: any) => { return x === "Environment" ? "prod" : x });
        let params = GetExportParams(true);

        expect(params.artifactsFolder).to.be.equal('ArtifactsFolder');
        expect(params.workspaceName).to.be.equal('TargetWorkspaceName');
        expect(params.destinationFolder).to.be.equal(ExportConstants.destinationFolder);
        expect(params.publishArtifact).to.be.equal(true);
    });

    it('should get export params for validate and deploy', async() => {
        let stubbedSPAttributes = sinon.stub(task, "getInput").callsFake((x: any) => { return x === "Environment" ? "prod" : x });
        let params = GetExportParams(false);

        expect(params.artifactsFolder).to.be.equal('ArtifactsFolder');
        expect(params.workspaceName).to.be.equal('TargetWorkspaceName');
        expect(params.destinationFolder).to.be.equal(ExportConstants.destinationFolder);
        expect(params.publishArtifact).to.be.equal(false);
    });

});

