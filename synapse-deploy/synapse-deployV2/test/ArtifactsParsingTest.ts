import {DATASETPAYLOAD, PIPELINEPAYLOAD} from "./helpers/testFixtures";
import task = require('azure-pipelines-task-lib/task');

try {
	// We set this here in a try catch because without the setting of the tempdirectory, 
	// running unit tests locally fails because of azure-pipelines-task-lib/task issue we picked up with the latest version of it.
	// Without the try catch, unit tests locally work, but in the build pipeline, 
	// this variable is readonly and cannot be set, so that fails. 
	let tempDir = task.getVariable("Agent.TempDirectory")!;
	console.log(tempDir);

	if(tempDir == undefined)
	{
		task.setVariable("Agent.TempDirectory", "test", false);
	}
}
catch{
}


import {getDependentsFromArtifactFromWorkspace} from "../workspaceArtifactsGetter";

const chai_object = require('chai');
const expect = chai_object.expect;
const assert = chai_object.assert;

describe("Validate artifacts parsing", () => {

    it('should find the depedants', () => {
        let dependants = getDependentsFromArtifactFromWorkspace(JSON.stringify(DATASETPAYLOAD));
        expect(dependants[0]).equal("LinkedServiceReference/bigdataqa0924ws-WorkspaceDefaultStorage");
        dependants = getDependentsFromArtifactFromWorkspace(JSON.stringify(PIPELINEPAYLOAD));
        expect(dependants[0]).equal("DatasetReference/SourceDataset_pqd");
        expect(dependants[1]).equal("DatasetReference/DestinationDataset_pqd");
    });
});