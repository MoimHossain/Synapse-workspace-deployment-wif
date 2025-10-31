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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationManager = void 0;
const OperationParams_1 = require("./OperationParams");
const Operations_1 = require("./Operations");
const artifacts_enum_1 = require("../artifacts_enum");
const path_1 = __importDefault(require("path"));
class OperationManager {
    static DeployArtifacts(templateFile = "", parameterFile = "") {
        return __awaiter(this, void 0, void 0, function* () {
            let params = OperationParams_1.GetDeployParams(templateFile, parameterFile);
            let deployer = new Operations_1.DeployOperation(params);
            yield deployer.PerformOperation();
        });
    }
    static ValidateArtifacts(publishArtifacts = true) {
        return __awaiter(this, void 0, void 0, function* () {
            yield OperationManager.ExportArtifacts(publishArtifacts);
        });
    }
    static ExportArtifacts(publishArtifacts) {
        return __awaiter(this, void 0, void 0, function* () {
            let params = OperationParams_1.GetExportParams(publishArtifacts);
            let exporter = new Operations_1.ExportOperation(params);
            yield exporter.PerformOperation();
        });
    }
    static ValidateAndDeploy() {
        return __awaiter(this, void 0, void 0, function* () {
            const folder = artifacts_enum_1.ExportConstants.destinationFolder;
            const templateFile = path_1.default.join(folder, artifacts_enum_1.ExportConstants.templateFile);
            const parameterFile = path_1.default.join(folder, artifacts_enum_1.ExportConstants.parameterFile);
            yield OperationManager.ValidateArtifacts(false);
            yield OperationManager.DeployArtifacts(templateFile, parameterFile);
        });
    }
}
exports.OperationManager = OperationManager;
//# sourceMappingURL=OperationsManager.js.map