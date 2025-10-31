import task = require('azure-pipelines-task-lib/task');
import {OPERATIONS} from "./artifacts_enum";
import {OperationManager} from "./Operations/OperationsManager";
import {BundleManager} from "./Operations/BundleManager";

var path = require('path');
task.setResourcePath(path.join(__dirname, 'task.json'));

async function run() {
    try {

        const operation = task.getInput('operation', true)!;
        const bundle_source = task.getInput('npmpackage');
        const bundle_manager = new BundleManager(bundle_source);
        switch(operation){
            case OPERATIONS.deploy :
                await OperationManager.DeployArtifacts();
                break;
            case OPERATIONS.validateDeploy :
                await bundle_manager.invokeBundle();
                await OperationManager.ValidateAndDeploy();
                break;
            case OPERATIONS.validate:
                await bundle_manager.invokeBundle();
                await OperationManager.ValidateArtifacts();
                break;
            case 'default':
                throw new Error(`Operation not supported : ${operation}`);
        }

    } catch (err) {
        console.log('An error occurred during execution: ' + err);
        task.setResult(task.TaskResult.Failed, "Encountered with exception:" + err);
    }
}

run();