"use strict";
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
const task = require("azure-pipelines-task-lib/task");
const artifacts_enum_1 = require("./artifacts_enum");
const OperationsManager_1 = require("./Operations/OperationsManager");
const BundleManager_1 = require("./Operations/BundleManager");
var path = require('path');
task.setResourcePath(path.join(__dirname, 'task.json'));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const operation = task.getInput('operation', true);
            const bundle_source = task.getInput('npmpackage');
            const bundle_manager = new BundleManager_1.BundleManager(bundle_source);
            switch (operation) {
                case artifacts_enum_1.OPERATIONS.deploy:
                    yield OperationsManager_1.OperationManager.DeployArtifacts();
                    break;
                case artifacts_enum_1.OPERATIONS.validateDeploy:
                    yield bundle_manager.invokeBundle();
                    yield OperationsManager_1.OperationManager.ValidateAndDeploy();
                    break;
                case artifacts_enum_1.OPERATIONS.validate:
                    yield bundle_manager.invokeBundle();
                    yield OperationsManager_1.OperationManager.ValidateArtifacts();
                    break;
                case 'default':
                    throw new Error(`Operation not supported : ${operation}`);
            }
        }
        catch (err) {
            console.log('An error occurred during execution: ' + err);
            task.setResult(task.TaskResult.Failed, "Encountered with exception:" + err);
        }
    });
}
run();
//# sourceMappingURL=index.js.map