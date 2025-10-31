import fs from 'fs';
import chai = require('chai');
import path = require("path");
import { getArtifacts, replaceStrByRegex } from "../armtemplateutils";
import { assert } from 'console';

var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);
var should = chai.should();

describe('ArmTemplateUtils tests', function () {
    it('artifact should return', function (done: Mocha.Done) {
        var armTemplateParametersForWorkspace = fs.readFileSync(path.join(__dirname, 'TemplateParametersForWorkspace.json'), 'utf8');
        var armTemplateForWorkspace = fs.readFileSync(path.join(__dirname, 'TemplateForWorkspace.json'), 'utf8');
        let artifacts = getArtifacts(armTemplateParametersForWorkspace, armTemplateForWorkspace, "", "", '');
        artifacts.should.eventually.be.fulfilled;
        artifacts.should.eventually.be.length(1);
        artifacts.should.eventually.be.an('array').to.deep.include({ "content": "{\"name\":\"xl_adf_akv\",\"type\":\"Microsoft.Synapse/workspaces/linkedServices\",\"apiVersion\":\"2019-06-01-preview\",\"properties\":{\"annotations\":[],\"type\":\"AzureKeyVault\",\"typeProperties\":{\"baseUrl\":\"https://xl-adf-akv.vault.azure.net/\"}},\"dependsOn\":[]}", "type": "Microsoft.Synapse/workspaces/linkedServices" });
        done();
    });

    it('artifact should be empty', function (done: Mocha.Done) {

        let artifacts = getArtifacts('', '', "", "", "");
        artifacts.should.eventually.be.rejected;
        done();
    });

    it('replaceStrByRegex can combine 2 in concat', function (done: Mocha.Done) {

        let inputString = `[concat('Microsoft.Synapse/workspaces/', workspace1)]`;
	    let outputString = `Microsoft.Synapse/workspaces/workspace1`;
	    let result = replaceStrByRegex(inputString);
        if(result!=outputString)
            done(`failed`);
        else
            done();
    });

    it('replaceStrByRegex can combine more than 2 in concat', function (done: Mocha.Done) {

        let inputString = `[concat('Microsoft.Synapse/workspaces/', workspace1, '2',3, '4')]`;
	    let outputString = `Microsoft.Synapse/workspaces/workspace1234`;
	    let result = replaceStrByRegex(inputString);
        if(result!=outputString)
            done(`failed`);
        else
            done();
    });

});