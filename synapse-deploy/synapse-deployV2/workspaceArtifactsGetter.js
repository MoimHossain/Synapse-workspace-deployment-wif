"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.SKipManagedPE = exports.getDependentsFromArtifactFromWorkspace = exports.getArtifactsToDeleteFromWorkspaceInOrder = exports.DatalakeSubArtifactsToDelete = exports.getArtifactsToDeleteFromWorkspace = exports.getArtifactsFromWorkspace = exports.getArtifactsFromWorkspaceOfType = void 0;
const artifactsclient_1 = require("./artifactsclient");
const deployUtils = __importStar(require("./deployutils"));
const deployutils_1 = require("./deployutils");
const httpClient = __importStar(require("typed-rest-client/HttpClient"));
const armtemplateutils_1 = require("./armtemplateutils");
const artifacts_enum_1 = require("./artifacts_enum");
const CommonUtils_1 = require("./CommonUtils");
const task = require("azure-pipelines-task-lib/task");
const packagejson = require('./package.json');
const userAgent = 'synapse-cicd-deploy-task-' + packagejson.version;
var requestOptions = {};
let ignoreSslErrors = task.getVariable("VSTS_ARM_REST_IGNORE_SSL_ERRORS");
requestOptions.ignoreSslError = ((ignoreSslErrors === null || ignoreSslErrors === void 0 ? void 0 : ignoreSslErrors.toLowerCase()) == "false");
requestOptions.socketTimeout = 0;
process.env.NODE_OPTIONS = "--tls-min-v1.2";
const client = new httpClient.HttpClient(userAgent, undefined, requestOptions);
const artifactTypesToQuery = [
    artifacts_enum_1.Artifact.credential,
    artifacts_enum_1.Artifact.dataflow,
    artifacts_enum_1.Artifact.dataset,
    artifacts_enum_1.Artifact.integrationruntime,
    artifacts_enum_1.Artifact.linkedservice,
    artifacts_enum_1.Artifact.notebook,
    artifacts_enum_1.Artifact.pipeline,
    artifacts_enum_1.Artifact.sparkjobdefinition,
    artifacts_enum_1.Artifact.sqlscript,
    artifacts_enum_1.Artifact.trigger,
    artifacts_enum_1.Artifact.managedprivateendpoints,
    artifacts_enum_1.Artifact.database,
    artifacts_enum_1.Artifact.kqlScript,
    artifacts_enum_1.Artifact.sparkconfiguration
];
function getArtifactsFromWorkspaceOfType(artifactTypeToQuery, targetWorkspaceName, environment) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        var params = yield deployUtils.getParams();
        var audienceUrl = artifactsclient_1.ArtifactClient.getAudienceUrl(environment);
        var token = yield deployutils_1.getAuthToken(params.connectedService, audienceUrl, environment, client);
        var headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'synapse-cicd-deploy-task-1.0.0'
        };
        let artifacts = new Array();
        var resourceUrl = getResourceFromWorkspaceUrl(targetWorkspaceName, environment, artifactTypeToQuery.toString());
        let moreResult = true;
        while (moreResult) {
            var resp = new Promise((resolve, reject) => {
                client.get(resourceUrl, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                    var resStatus = res.message.statusCode;
                    if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                        console.log(`Failed to fetch workspace info, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                        return reject("Failed to fetch workspace info " + res.message.statusMessage);
                    }
                    var body = yield res.readBody();
                    if (!body) {
                        console.log("No response body for url: ", resourceUrl);
                        return reject("Failed to fetch workspace info response");
                    }
                    return resolve(body);
                }), (reason) => {
                    console.log('Failed to fetch artifacts from workspace: ', reason);
                    return reject(deployUtils.DeployStatus.failed);
                });
            });
            var resourcesString = yield resp;
            var resourcesJson = JSON.parse(resourcesString);
            const list = (_a = resourcesJson.value) !== null && _a !== void 0 ? _a : resourcesJson === null || resourcesJson === void 0 ? void 0 : resourcesJson.items;
            moreResult = false;
            for (let artifactJson of list) {
                let artifactJsonContent = JSON.stringify(artifactJson);
                let artifactName = (_b = artifactJson.name) !== null && _b !== void 0 ? _b : artifactJson.Name;
                let type = (_c = artifactJson.type) !== null && _c !== void 0 ? _c : ((artifactJson.EntityType === 'DATABASE') ? artifacts_enum_1.DataFactoryType.database : artifactJson.EntityType);
                if (type == artifacts_enum_1.DataFactoryType.database && SkipDatabase(artifactJsonContent))
                    continue;
                let resource = {
                    type: type,
                    isDefault: false,
                    content: artifactJsonContent,
                    name: artifactName,
                    dependson: getDependentsFromArtifactFromWorkspace(artifactJsonContent)
                };
                if (type !== artifacts_enum_1.DataFactoryType.database && CommonUtils_1.isDefaultArtifact(artifactJsonContent)) {
                    resource.isDefault = true;
                }
                if (resourcesJson.hasOwnProperty("nextLink")) {
                    resourceUrl = resourcesJson.nextLink;
                    moreResult = true;
                }
                if (type == artifacts_enum_1.DataFactoryType.database && resourcesJson.hasOwnProperty("continuationToken")) {
                    resourceUrl = resourcesJson.ContinuationToken;
                    moreResult = true;
                }
                artifacts.push(resource);
            }
        }
        return artifacts;
    });
}
exports.getArtifactsFromWorkspaceOfType = getArtifactsFromWorkspaceOfType;
function getArtifactsFromWorkspace(targetWorkspaceName, environment) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Getting Artifacts from workspace: ${targetWorkspaceName}.`);
        let artifacts = new Array();
        for (let x = 0; x < artifactTypesToQuery.length; x++) {
            if (artifactTypesToQuery[x] == artifacts_enum_1.Artifact.managedprivateendpoints && (yield SKipManagedPE(targetWorkspaceName, environment)))
                continue;
            let artifactsOfType = yield getArtifactsFromWorkspaceOfType(artifactTypesToQuery[x], targetWorkspaceName, environment);
            artifactsOfType.forEach((value) => {
                artifacts.push(value);
            });
        }
        return artifacts;
    });
}
exports.getArtifactsFromWorkspace = getArtifactsFromWorkspace;
function getArtifactsToDeleteFromWorkspace(artifactsInWorkspace, artifactsToDeploy, typeMap) {
    console.log("Getting Artifacts which should be deleted from workspace.");
    let artifactsToDelete = new Array();
    let resourceFound = true;
    artifactsInWorkspace.forEach((checkResource) => {
        resourceFound = false;
        let checkResourceType = checkResource.type;
        checkResourceType = checkResourceType.replace(` `, ``);
        checkResourceType = checkResourceType.toLowerCase();
        let artifactTypeToDeploy = typeMap.get(checkResourceType);
        if (artifactTypeToDeploy != artifacts_enum_1.Artifact.sqlpool &&
            artifactTypeToDeploy != artifacts_enum_1.Artifact.bigdatapools &&
            artifactTypeToDeploy != artifacts_enum_1.Artifact.managedvirtualnetworks &&
            artifactTypeToDeploy != artifacts_enum_1.Artifact.integrationruntime &&
            checkResource.isDefault != true) {
            for (let i = 0; i < artifactsToDeploy.length; i++) {
                for (let j = 0; j < artifactsToDeploy[i].length; j++) {
                    let resouce = artifactsToDeploy[i][j];
                    if (resouce.name.toLowerCase() == checkResource.name.toLowerCase() &&
                        resouce.type.toLowerCase() == checkResource.type.toLowerCase()) {
                        resourceFound = true;
                        break;
                    }
                }
                if (resourceFound) {
                    break;
                }
            }
            if (!resourceFound) {
                console.log(`Artifact not found in template. deleting ${checkResource.name} of type ${checkResource.type}`);
                artifactsToDelete.push(checkResource);
            }
        }
    });
    return artifactsToDelete;
}
exports.getArtifactsToDeleteFromWorkspace = getArtifactsToDeleteFromWorkspace;
function DatalakeSubArtifactsToDelete(artifactsInWorkspace, artifactsToDeploy, targetWorkspaceName, environment) {
    return __awaiter(this, void 0, void 0, function* () {
        let artifactsToDelete = new Array();
        let databases = yield getArtifactsFromWorkspaceOfType(artifacts_enum_1.Artifact.database, targetWorkspaceName, environment);
        let databaseWithChildren = yield GetDatabasesWithChildren(databases, targetWorkspaceName, environment);
        let tables = new Array();
        let relation = new Array();
        databaseWithChildren.forEach((wsArtifact) => {
            let dbFound = false;
            outer: for (let i = 0; i < artifactsToDeploy.length; i++) {
                for (let j = 0; j < artifactsToDeploy[i].length; j++) {
                    let resource = artifactsToDeploy[i][j];
                    let templateResourceObj = JSON.parse(resource.content);
                    if (resource.name.toLowerCase() == wsArtifact.name.toLowerCase() &&
                        resource.type.toLowerCase() == artifacts_enum_1.DataFactoryType.database.toLowerCase()) {
                        dbFound = true;
                        for (let wsDdl of wsArtifact.children) {
                            let dbSubResourceFound = false;
                            for (let templateDdl of templateResourceObj['properties']['Ddls']) {
                                if (wsDdl.name == templateDdl["NewEntity"]["Name"]) {
                                    dbSubResourceFound = true;
                                    break;
                                }
                            }
                            if (!dbSubResourceFound) {
                                if (wsDdl.type.toLowerCase() == 'table') {
                                    let path = `databases/${wsArtifact.name}/tables/${wsDdl.name}`;
                                    tables.push(path);
                                }
                                if (wsDdl.type.toLowerCase() == 'relationship') {
                                    let path = `databases/${wsArtifact.name}/relationships/${wsDdl.name}`;
                                    relation.push(path);
                                }
                            }
                        }
                    }
                    if (dbFound) {
                        break outer;
                    }
                }
            }
        });
        artifactsToDelete = artifactsToDelete.concat(relation);
        artifactsToDelete = artifactsToDelete.concat(tables);
        console.log(`Found ${artifactsToDelete.length} lake database tables/relationships to delete.`);
        return artifactsToDelete;
    });
}
exports.DatalakeSubArtifactsToDelete = DatalakeSubArtifactsToDelete;
function countOfArtifactDependancy(checkArtifact, selectedListOfResources) {
    let result = 0;
    for (var res = 0; res < selectedListOfResources.length; res++) {
        let resource = selectedListOfResources[res];
        let resName = checkArtifact.name;
        let restype = checkArtifact.type;
        if (restype.indexOf("Microsoft.Synapse/workspaces/") > -1) {
            restype = restype.substr("Microsoft.Synapse/workspaces/".length);
        }
        let nameToCheck = `${restype.substring(0, restype.length - 1)}Reference/${resName}`;
        nameToCheck = nameToCheck.toLowerCase();
        for (let i = 0; i < resource.dependson.length; i++) {
            if (resource.dependson[i].toLowerCase() == nameToCheck) {
                result++;
                break;
            }
        }
    }
    return result;
}
function getArtifactsToDeleteFromWorkspaceInOrder(artifactsToDelete) {
    console.log("Computing dependancies for Artifacts which should be deleted from workspace.");
    let artifactsBatches = new Array();
    let artifactBatch = new Array();
    let artifactsOrdered = new Array();
    let MAX_ITERATIONS = 500;
    let MAX_PARALLEL_ARTIFACTS = 20;
    var count = 0;
    var iteration = 0;
    while (count < artifactsToDelete.length && iteration < MAX_ITERATIONS) {
        iteration++;
        if (artifactBatch.length > 0) {
            artifactsBatches.push(artifactBatch);
            artifactBatch = new Array();
        }
        for (var res = 0; res < artifactsToDelete.length; res++) {
            if (armtemplateutils_1.checkIfArtifactExists(artifactsToDelete[res], artifactsOrdered)) {
                continue;
            }
            let allDependencyMet = false;
            let dependencyInArtifactsToDelete = countOfArtifactDependancy(artifactsToDelete[res], artifactsToDelete);
            let dependencyInArtifactsOrdered = countOfArtifactDependancy(artifactsToDelete[res], artifactsOrdered);
            let dependancyInCurrentBatch = countOfArtifactDependancy(artifactsToDelete[res], artifactBatch);
            if (dependencyInArtifactsToDelete == 0) {
                allDependencyMet = true;
            }
            else if (dependancyInCurrentBatch == 0 && dependencyInArtifactsOrdered == dependencyInArtifactsToDelete) {
                allDependencyMet = true;
            }
            if (allDependencyMet) {
                artifactsOrdered.push(artifactsToDelete[res]);
                if (artifactBatch.length >= MAX_PARALLEL_ARTIFACTS) {
                    artifactsBatches.push(artifactBatch);
                    artifactBatch = new Array();
                }
                artifactBatch.push(artifactsToDelete[res]);
            }
        }
        console.log(`Iteration ${iteration} Figured out deletion order for ${artifactsOrdered.length} / ${artifactsToDelete.length} Artifacts for Dependancies.`);
        count = artifactsOrdered.length;
    }
    if (artifactBatch.length > 0) {
        artifactsBatches.push(artifactBatch);
    }
    if (iteration == MAX_ITERATIONS) {
        console.log();
        console.log("Could not figure out full dependancy model for these artifact for delete. Check template and target workspace for correctness.");
        console.log("-----------------------------------------------------------------------------------------------");
        for (var res = 0; res < artifactsToDelete.length; res++) {
            if (!armtemplateutils_1.checkIfArtifactExists(artifactsToDelete[res], artifactsOrdered)) {
                console.log(`Name: ${artifactsToDelete[res].name}, Type: ${artifactsToDelete[res].type}`);
            }
        }
        throw new Error("Could not figure out full dependancy model for deleting artifacts not in template. For the list above, check the template to see which artifacts depends on them.");
    }
    return artifactsBatches;
}
exports.getArtifactsToDeleteFromWorkspaceInOrder = getArtifactsToDeleteFromWorkspaceInOrder;
function getResourceFromWorkspaceUrl(targetWorkspaceName, environment, resourceType) {
    var url = artifactsclient_1.ArtifactClient.getUrlByEnvironment(targetWorkspaceName, environment);
    if (resourceType == artifacts_enum_1.Artifact.managedprivateendpoints) {
        url = url + '/' + artifacts_enum_1.Artifact.managedvirtualnetworks + '/default';
        url = `${url}/${resourceType}?api-version=2019-06-01-preview`;
    }
    else
        url = `${url}/${resourceType}s?api-version=2019-06-01-preview`;
    return url;
}
function getDependentsFromArtifactFromWorkspace(artifactContent) {
    let dependants = new Array();
    crawlArtifacts(JSON.parse(artifactContent), dependants, "referenceName");
    return dependants;
}
exports.getDependentsFromArtifactFromWorkspace = getDependentsFromArtifactFromWorkspace;
function crawlArtifacts(artifactContent, dependants, key) {
    if (!artifactContent || typeof artifactContent !== "object") {
        return false;
    }
    const keys = Object.keys(artifactContent);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === key) {
            let depType = artifactContent["type"];
            let depName = artifactContent["referenceName"];
            dependants.push(`${depType}/${depName}`);
        }
        const path = crawlArtifacts(artifactContent[keys[i]], dependants, key);
        if (path) {
            return true;
        }
    }
    return false;
}
function SKipManagedPE(targetWorkspaceName, environment) {
    return __awaiter(this, void 0, void 0, function* () {
        var params = yield deployUtils.getParams();
        var audienceUrl = artifactsclient_1.ArtifactClient.getAudienceUrl(environment);
        var token = yield deployutils_1.getAuthToken(params.connectedService, audienceUrl, environment, client);
        var headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'User-Agent': userAgent
        };
        var resourceUrl = getResourceFromWorkspaceUrl(targetWorkspaceName, environment, artifacts_enum_1.Artifact.managedprivateendpoints);
        var resp = new Promise((resolve, reject) => {
            client.get(resourceUrl, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                var resStatus = res.message.statusCode;
                if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                    let body = yield res.readBody();
                    if (body.includes("does not have a managed virtual network associated"))
                        return resolve(true);
                }
                return resolve(false);
            }));
        });
        return resp;
    });
}
exports.SKipManagedPE = SKipManagedPE;
function SkipDatabase(artifactJsonContent) {
    let artifactJson = JSON.parse(artifactJsonContent);
    if (artifactJson != null &&
        artifactJson["Origin"] != null &&
        artifactJson["Origin"]["Type"].toLowerCase() == "SPARK".toLowerCase() &&
        artifactJson["Properties"] != null &&
        artifactJson["Properties"]["IsSyMSCDMDatabase"] != null &&
        artifactJson["Properties"]["IsSyMSCDMDatabase"].toString().toLowerCase() == "true") {
        return false;
    }
    return true;
}
function GetDatabasesWithChildren(databases, targetWorkspaceName, environment) {
    return __awaiter(this, void 0, void 0, function* () {
        let databasesWithChildren = new Array();
        try {
            for (let db of databases) {
                console.log(`Fetching details of database: ${db.name}`);
                let children = new Array();
                for (let action of ['relationship', 'table']) {
                    let requestURI = getResourceFromWorkspaceUrl(targetWorkspaceName, environment, `databases/${db.name}/${action}`);
                    let fetchMore = true;
                    while (fetchMore) {
                        fetchMore = false;
                        let params = yield deployUtils.getParams();
                        let audienceUrl = artifactsclient_1.ArtifactClient.getAudienceUrl(environment);
                        let token = yield deployutils_1.getAuthToken(params.connectedService, audienceUrl, environment, client);
                        let headers = {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'User-Agent': userAgent
                        };
                        yield client.get(requestURI, headers).then((res) => __awaiter(this, void 0, void 0, function* () {
                            let resStatus = res.message.statusCode;
                            if (resStatus != 200 && resStatus != 201 && resStatus != 202) {
                                console.info(`Failed to fetch database ${db.name} info, status: ${resStatus}; status message: ${res.message.statusMessage}`);
                                let body = yield res.readBody();
                                throw new Error("Failed to fetch database info :" + body);
                            }
                            let body = yield res.readBody();
                            let childrenObj = JSON.parse(body)["items"];
                            for (let child of childrenObj) {
                                let childObj = {
                                    name: child["Name"],
                                    type: action
                                };
                                children.push(childObj);
                            }
                            let bodyObj = JSON.parse(body);
                            if (bodyObj.hasOwnProperty('continuationToken')) {
                                requestURI = bodyObj['continuationToken'];
                                fetchMore = true;
                            }
                        }));
                    }
                }
                let dbWithChildren = {
                    name: db.name,
                    children: children
                };
                databasesWithChildren.push(dbWithChildren);
            }
            return databasesWithChildren;
        }
        catch (err) {
            throw new Error(err);
        }
    });
}
//# sourceMappingURL=workspaceArtifactsGetter.js.map