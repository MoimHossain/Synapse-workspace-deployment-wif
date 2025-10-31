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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportOperation = exports.ValidateOperation = exports.DeployOperation = void 0;
const artifacts_enum_1 = require("../artifacts_enum");
const PackageFileDownloader_1 = require("../PackageFileDownloader");
const artifactsclient_1 = require("../artifactsclient");
const deployutils = __importStar(require("../deployutils"));
const CommonUtils_1 = require("../CommonUtils");
const orchestration_1 = require("../orchestration");
const BundleManager_1 = require("./BundleManager");
const path_1 = __importDefault(require("path"));
class DeployOperation {
    constructor(operationParams) {
        this.operationType = artifacts_enum_1.OPERATIONS.deploy;
        this.operationParams = operationParams;
    }
    PerformOperation() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Starting ${this.operationType} operation`);
            if ((0, CommonUtils_1.isStrNullOrEmpty)(this.operationParams.overrides) && this.operationParams.failOnMissingOverrides) {
                throw new Error("Overrides not provided.");
            }
            try {
                let packageFiles = {
                    templateFile: this.operationParams.templateFile,
                    parametersFile: this.operationParams.parameterFile
                };
                let packageFileDownloader = new PackageFileDownloader_1.PackageFileDownloader(packageFiles);
                let client = (0, CommonUtils_1.GetHttpClient)();
                const artifactClient = new artifactsclient_1.ArtifactClient(yield deployutils.getParams(), client);
                yield (0, orchestration_1.orchestrateFromPublishBranch)(packageFileDownloader, artifactClient, this.operationParams.workspaceName, this.operationParams.environment, this.operationParams.overrides, this.operationParams.deleteArtifacts, this.operationParams.deployMPE);
            }
            catch (err) {
                console.log(`${this.operationType} operation failed`);
                throw err;
            }
        });
    }
}
exports.DeployOperation = DeployOperation;
class ValidateOperation {
    constructor(operationParams) {
        this.operationType = artifacts_enum_1.OPERATIONS.validate;
        this.operationParams = operationParams;
    }
    PerformOperation() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Starting ${this.operationType} operation`);
            let cmd = [
                'node',
                BundleManager_1.BundleManager.defaultBundleFilePath,
                this.operationType,
                `"${this.operationParams.artifactsFolder}"`,
                this.operationParams.workspaceName
            ].join(' ');
            yield BundleManager_1.BundleManager.ExecuteShellCommand(cmd);
        });
    }
}
exports.ValidateOperation = ValidateOperation;
class ExportOperation {
    constructor(operationParams) {
        this.operationType = artifacts_enum_1.OPERATIONS.export;
        this.operationParams = operationParams;
    }
    PerformOperation() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Starting ${this.operationType} operation`);
            let cmd = [
                'node',
                BundleManager_1.BundleManager.defaultBundleFilePath,
                this.operationType,
                `"${this.operationParams.artifactsFolder}"`,
                this.operationParams.workspaceName,
                this.operationParams.destinationFolder
            ].join(' ');
            yield BundleManager_1.BundleManager.ExecuteShellCommand(cmd);
            if (this.operationParams.publishArtifact) {
                console.log("Generating artifacts.");
                console.log(`##vso[artifact.upload containerfolder=export;artifactname=${this.operationParams.workspaceName}]${path_1.default.join(process.cwd(), this.operationParams.destinationFolder)}`);
            }
        });
    }
}
exports.ExportOperation = ExportOperation;
//# sourceMappingURL=Operations.js.map