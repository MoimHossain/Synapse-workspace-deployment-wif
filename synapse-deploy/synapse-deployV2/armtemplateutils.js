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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifacts = getArtifacts;
exports.replaceBackSlashCode = replaceBackSlashCode;
exports.replaceDoubleQuoteCode = replaceDoubleQuoteCode;
exports.replaceStrByRegex = replaceStrByRegex;
exports.checkIfNameExists = checkIfNameExists;
exports.checkIfArtifactExists = checkIfArtifactExists;
exports.getDependentsFromArtifact = getDependentsFromArtifact;
const uuid_1 = require("uuid");
const yaml = __importStar(require("js-yaml"));
const CommonUtils_1 = require("./CommonUtils");
const artifacts_enum_1 = require("./artifacts_enum");
const backslash = "7FD5C49AB6444AC1ACCD56B689067FBBAD85B74B0D8943CA887371839DFECF85";
const quote = "48C16896271D483C916DE1C4EC6F24DBC945F900F9AB464B828EC8005364D322";
const doublequote = "4467B65E39AA40998907771187C9B539847A7E801C5E4F0E9513C1D6154BC816";
function getArtifacts(armParams, armTemplate, overrideArmParameters, targetWorkspaceName, targetLocation) {
    return __awaiter(this, void 0, void 0, function* () {
        armParams = replaceBackSlash(armParams);
        overrideArmParameters = replaceBackSlash(overrideArmParameters);
        armTemplate = replaceParameters(armParams, armTemplate, overrideArmParameters, targetWorkspaceName);
        armTemplate = replaceVariables(armTemplate);
        armTemplate = replaceStrByRegex(armTemplate);
        let defaultArtifacts = findDefaultArtifacts(armTemplate, targetWorkspaceName);
        armTemplate = JSON.stringify(JSON.parse(armTemplate));
        return getArtifactsFromArmTemplate(armTemplate, targetLocation, defaultArtifacts);
    });
}
function replaceBackSlashCode(inputString) {
    if (inputString == null) {
        return "";
    }
    let outputString = inputString;
    while (outputString.indexOf(quote) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(quote))
            + `\\\"`
            + outputString.substr(outputString.indexOf(quote) + quote.length);
    }
    while (outputString.indexOf(backslash) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(backslash))
            + `\\`
            + outputString.substr(outputString.indexOf(backslash) + backslash.length);
    }
    return outputString;
}
function replaceBackSlash(inputString) {
    if (inputString == null || inputString == "") {
        return "";
    }
    let outputString = inputString;
    while (outputString.indexOf(`\\\\\\\\`) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(`\\\\\\\\`)) + backslash + backslash + backslash + backslash + outputString.substr(outputString.indexOf(`\\\\\\\\`) + 4);
    }
    while (outputString.indexOf(`\\\\`) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(`\\\\`)) + backslash + backslash + outputString.substr(outputString.indexOf(`\\\\`) + 2);
    }
    while (outputString.indexOf(`\\\"`) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(`\\\"`)) + quote + outputString.substr(outputString.indexOf(`\\\"`) + 2);
    }
    while (outputString.indexOf(`\\`) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(`\\`)) + backslash + outputString.substr(outputString.indexOf(`\\`) + 1);
    }
    return outputString;
}
function replaceDoubleQuoteCode(inputString) {
    if (inputString == null) {
        return "";
    }
    let outputString = inputString;
    while (outputString.indexOf(doublequote) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(doublequote))
            + `"`
            + outputString.substr(outputString.indexOf(doublequote) + doublequote.length);
    }
    return outputString;
}
function replaceDoubleQuote(inputString) {
    if (inputString == null || inputString == "") {
        return "";
    }
    let outputString = inputString;
    while (outputString.indexOf(`\"`) >= 0) {
        outputString = outputString.substr(0, outputString.indexOf(`\"`)) +
            doublequote +
            outputString.substr(outputString.indexOf(`\"`) + 1);
    }
    return outputString;
}
function findDefaultArtifacts(armTemplate, targetworkspace) {
    let defaultArtifacts = new Map();
    let jsonArmTemplateParams = JSON.parse(armTemplate);
    for (var value in jsonArmTemplateParams.resources) {
        let artifactJson = jsonArmTemplateParams.resources[value];
        let artifactName = artifactJson.name;
        if ((0, CommonUtils_1.isDefaultArtifact)(JSON.stringify(artifactJson))) {
            if (artifactName.indexOf("/") > 0) {
                let lastIndexOfslash = artifactName.lastIndexOf("/");
                let nametoreplace = artifactName.substr(lastIndexOfslash + 1);
                let defaultArtifactName = '';
                for (let i = 0; i < CommonUtils_1.DefaultArtifact.DefaultArtifacts.length; i++) {
                    let name = CommonUtils_1.DefaultArtifact.DefaultArtifacts[i];
                    if (nametoreplace.toLowerCase().includes(name.name.toLowerCase())) {
                        defaultArtifactName = nametoreplace.substring(nametoreplace.toLowerCase().indexOf(name.name.toLowerCase()));
                        break;
                    }
                }
                let replacedName = defaultArtifactName == "WorkspaceSystemIdentity" ? defaultArtifactName : `${targetworkspace}-${defaultArtifactName}`;
                if (nametoreplace == replacedName) {
                    continue;
                }
                defaultArtifacts.set(nametoreplace, replacedName);
            }
        }
    }
    return defaultArtifacts;
}
function replaceParameters(armParams, armTemplate, overrideArmParameters, targetWorkspaceName) {
    console.log("Begin replacement of parameters in the template");
    let armParamValues = getParameterValuesFromArmTemplate(armParams, armTemplate, overrideArmParameters, targetWorkspaceName);
    armParamValues.forEach((value, key) => {
        value = value.toString();
        if (value.indexOf("parameters") > -1) {
            armParamValues.forEach((valueInside, keyInside) => {
                if (value.indexOf(keyInside) > -1) {
                    armParamValues.set(key, value.split('[' + keyInside + ']').join(`'${valueInside}'`));
                }
                if (value.indexOf(keyInside) > -1) {
                    armParamValues.set(key, value.split(keyInside).join(`'${valueInside}'`));
                }
            });
        }
    });
    armParamValues.forEach((value, key) => {
        value = value.toString();
        if (value.indexOf("concat") > -1) {
            armParamValues.set(key, replaceStrByRegex(value));
        }
    });
    armParamValues.forEach((value, key) => {
        if (isJsonValue(replaceDoubleQuoteCode(value))) {
            armTemplate = armTemplate.split(`"[` + key + `]"`).join(`${replaceDoubleQuoteCode(value)}`);
        }
        else {
            armTemplate = armTemplate.split(`"[` + key + `]"`).join(`"${replaceDoubleQuoteCode(value)}"`);
        }
        armTemplate = armTemplate.split(key).join(`'${replaceDoubleQuoteCode(value)}'`);
    });
    console.log("Complete replacement of parameters in the template");
    return armTemplate;
}
function isJsonValue(testString) {
    try {
        JSON.parse(testString);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function replaceVariables(armTemplate) {
    console.log("Begin replacement of variables in the template");
    let jsonArmTemplateParams = JSON.parse(armTemplate);
    let armVariableValues = new Map();
    for (var value in jsonArmTemplateParams.variables) {
        let variableValue = jsonArmTemplateParams.variables[value];
        variableValue = replaceStrByRegex(variableValue);
        armVariableValues.set(`variables('${value}')`, variableValue);
    }
    armVariableValues.forEach((value, key) => {
        armTemplate = armTemplate.split(key).join(`${value}`);
    });
    console.log("Complete replacement of variables in the template");
    return armTemplate;
}
function replaceStrByRegex(str) {
    var regexOutside = /\[concat\((.*?)\)\]/g;
    var resultOutside = str.replace(regexOutside, function (matchedStr, strOutside) {
        var result = ``;
        let resultArgs = strOutside.split(`,`);
        resultArgs.forEach((arg) => {
            let fragment = arg.trim();
            if (fragment.endsWith("'")) {
                fragment = fragment.substring(1, fragment.length - 1);
            }
            result += fragment;
        });
        return result;
    });
    return resultOutside;
}
function getParameterValuesFromArmTemplate(armParams, armTemplate, overrideArmParameters, targetWorkspaceName) {
    let jsonArmParams = JSON.parse(armParams);
    let armParamValues = new Map();
    for (var value in jsonArmParams.parameters) {
        armParamValues.set(`parameters('${value}')`, replaceDoubleQuote(sanitize(JSON.stringify(jsonArmParams.parameters[value].value))));
    }
    let jsonArmTemplateParams = JSON.parse(armTemplate);
    let armTemplateParamValues = new Map();
    for (var value in jsonArmTemplateParams.parameters) {
        armTemplateParamValues.set(`parameters('${value}')`, replaceDoubleQuote(JSON.stringify(jsonArmTemplateParams.parameters[value].defaultValue)));
    }
    armTemplateParamValues.forEach((value, key) => {
        if (!armParamValues.has(key)) {
            armParamValues.set(`parameters('${key}')`, value);
        }
    });
    armParamValues.set(`parameters('workspaceName')`, targetWorkspaceName);
    if (overrideArmParameters != null && overrideArmParameters.length > 2) {
        let cnt = 1;
        if (overrideArmParameters.startsWith('-')) {
            while (overrideArmParameters.length > 0 && overrideArmParameters.indexOf('-') > -1 && overrideArmParameters.indexOf(' ') > -1 && cnt < 1000) {
                cnt = cnt + 1;
                let startIndex = overrideArmParameters.indexOf('-') + '-'.length;
                let endIndex = overrideArmParameters.indexOf(' ');
                let paramName = overrideArmParameters.substring(startIndex, endIndex).trim();
                overrideArmParameters = overrideArmParameters.substring(endIndex);
                startIndex = overrideArmParameters.indexOf(' ') + ' '.length;
                endIndex = overrideArmParameters.indexOf(' -', startIndex);
                if (endIndex == -1) {
                    endIndex = overrideArmParameters.length;
                }
                let paramValue = sanitize(overrideArmParameters.substring(startIndex, endIndex).trim());
                armParamValues.set(`parameters('${paramName}')`, paramValue);
                overrideArmParameters = overrideArmParameters.substring(endIndex).trim();
            }
        }
        else {
            let overrides = yaml.load(overrideArmParameters);
            let overridesObj = JSON.parse(JSON.stringify(overrides));
            for (let key in overridesObj) {
                let paramValue = JSON.stringify(overridesObj[key]);
                armParamValues.set(`parameters('${key}')`, sanitize(paramValue));
            }
        }
    }
    return armParamValues;
}
function sanitize(paramValue) {
    if ((paramValue.startsWith("\"") && paramValue.endsWith("\"")) ||
        (paramValue.startsWith("'") && paramValue.endsWith("'"))) {
        paramValue = paramValue.substr(1, paramValue.length - 2);
    }
    return paramValue;
}
function removeWorkspaceNameFromResourceName(resourceName) {
    while (resourceName.indexOf("/") >= 0) {
        resourceName = resourceName.substring(resourceName.indexOf("/") + 1);
    }
    return resourceName;
}
function getArtifactsFromArmTemplate(armTemplate, targetLocation, defaultArtifacts) {
    console.log("Begin getting Artifacts From Template");
    let jsonArmTemplateParams = JSON.parse(armTemplate);
    let artifacts = new Array();
    for (var value in jsonArmTemplateParams.resources) {
        let artifactJson = jsonArmTemplateParams.resources[value];
        let artifactType = artifactJson.type;
        if (artifacts_enum_1.DataFactoryType.sqlpool == artifactType || artifacts_enum_1.DataFactoryType.bigdatapools == artifactType || artifacts_enum_1.DataFactoryType.managedVirtualNetworks == artifactType) {
            continue;
        }
        if (artifactType.toLowerCase().indexOf(`sparkjobdefinition`) > -1) {
            var fileLocation = artifactJson['properties']['jobProperties']['file'];
            if (!fileLocation) {
                throw new Error("File is missing in spark job defination ");
            }
        }
        artifactJson.name = removeWorkspaceNameFromResourceName(artifactJson.name);
        for (let i = 0; i < artifactJson.dependsOn.length; i++) {
            let dependancyName = artifactJson.dependsOn[i];
            defaultArtifacts.forEach((value, key) => {
                if (dependancyName.indexOf(key) > -1 &&
                    dependancyName.indexOf("linkedServices") > -1) {
                    artifactJson.dependsOn[i] = artifactJson.dependsOn[i].replace(key, value);
                }
            });
        }
        let artifactProperties = artifactJson.properties;
        if (artifactProperties != null) {
            let linkedServiceName = artifactProperties.linkedServiceName;
            if (linkedServiceName != null) {
                let referenceName = linkedServiceName.referenceName;
                if (referenceName != null) {
                    defaultArtifacts.forEach((value, key) => {
                        if (referenceName.indexOf(key) > -1) {
                            artifactJson.properties.linkedServiceName.referenceName = artifactJson.properties.linkedServiceName.referenceName.replace(key, value);
                        }
                    });
                }
            }
        }
        for (var artifactJsonValue in artifactJson.properties) {
            if (artifactJsonValue != "typeProperties" ||
                JSON.stringify(artifactJson.properties.typeProperties).indexOf(`LinkedServiceReference`) == -1) {
                continue;
            }
            for (var artifactJsonTypeProperties in artifactJson.properties.typeProperties) {
                if (JSON.stringify(artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`]).indexOf(`LinkedServiceReference`) == -1) {
                    continue;
                }
                let artifactJsonTypePropertiesJson = artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`];
                for (var artifactJsonTypePropertiesValues in artifactJsonTypePropertiesJson) {
                    let artifactJsonTypePropertiesValueslinkedService = artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService;
                    if (artifactJsonTypePropertiesValueslinkedService == null) {
                        continue;
                    }
                    let artifactJsonTypePropertiesValueslinkedServiceType = artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService.type;
                    if (artifactJsonTypePropertiesValueslinkedServiceType == null) {
                        continue;
                    }
                    if (artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService.type
                        == "LinkedServiceReference") {
                        defaultArtifacts.forEach((value, key) => {
                            if (artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService.referenceName.indexOf(key) > -1) {
                                artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService.referenceName
                                    = artifactJson.properties.typeProperties[`${artifactJsonTypeProperties}`][artifactJsonTypePropertiesValues].linkedService.referenceName.replace(key, value);
                            }
                        });
                    }
                }
            }
        }
        let artifactJsonContent = JSON.stringify(artifactJson);
        defaultArtifacts.forEach((value, key) => {
            let refName = `"referenceName":"${key}"`;
            let refNameReplacement = `"referenceName":"${value}"`;
            while (artifactJsonContent.indexOf(refName) > -1) {
                artifactJsonContent = artifactJsonContent.replace(refName, refNameReplacement);
            }
        });
        let resource = {
            type: artifactType,
            isDefault: false,
            content: artifactJsonContent,
            name: artifactJson.name,
            dependson: getDependentsFromArtifact(artifactJsonContent)
        };
        if (artifactType.toLowerCase().indexOf(`notebook`) > -1) {
            if (!artifactJson.name) {
                resource.content = convertIpynb2Payload(artifactJson);
            }
        }
        console.log(`Found Artifact of type ${artifactType}`);
        if ((0, CommonUtils_1.isDefaultArtifact)(JSON.stringify(artifactJson))) {
            resource.isDefault = true;
            defaultArtifacts.forEach((value, key) => {
                resource.name = resource.name.replace(key, value);
            });
            console.log(`\tWill be skipped as its a default resource.`);
        }
        if (!checkIfArtifactExists(resource, artifacts)) {
            artifacts.push(resource);
        }
    }
    let artifactsOrdered = new Array();
    let artifactsBatches = new Array();
    let artifactBatch = new Array();
    let iteration = 0;
    for (let i = 0; i < artifacts.length; i++) {
        artifacts[i].content = replaceDoubleQuoteCode(replaceBackSlashCode(artifacts[i].content));
        artifacts[i].name = replaceDoubleQuoteCode(replaceBackSlashCode(artifacts[i].name));
        for (let j = 0; j < artifacts[i].dependson.length; j++) {
            artifacts[i].dependson[j] = replaceDoubleQuoteCode(replaceBackSlashCode(artifacts[i].dependson[j]));
        }
    }
    let MAX_ITERATIONS = 500;
    let MAX_PARALLEL_ARTIFACTS = 20;
    while (artifactsOrdered.length < artifacts.length && iteration < MAX_ITERATIONS) {
        iteration++;
        if (artifactBatch.length > 0) {
            artifactsBatches.push(artifactBatch);
            artifactBatch = new Array();
        }
        for (var res = 0; res < artifacts.length; res++) {
            if (checkIfArtifactExists(artifacts[res], artifactsOrdered)) {
                continue;
            }
            let dependancies = artifacts[res].dependson;
            if (dependancies.length == 0) {
                artifactsOrdered.push(artifacts[res]);
                if (artifactBatch.length >= MAX_PARALLEL_ARTIFACTS) {
                    artifactsBatches.push(artifactBatch);
                    artifactBatch = new Array();
                }
                artifactBatch.push(artifacts[res]);
                continue;
            }
            let allDependencyMet = true;
            dependancies.forEach((dep) => {
                if (!checkIfNameExists(dep, artifactsOrdered)) {
                    allDependencyMet = false;
                }
            });
            if (allDependencyMet) {
                artifactsOrdered.push(artifacts[res]);
                if (artifactBatch.length >= MAX_PARALLEL_ARTIFACTS) {
                    artifactsBatches.push(artifactBatch);
                    artifactBatch = new Array();
                }
                artifactBatch.push(artifacts[res]);
            }
        }
        console.log(`Iteration ${iteration} Figured out deployment order for ${artifactsOrdered.length} / ${artifacts.length} Artifacts for Dependancies.`);
    }
    if (artifactBatch.length > 0) {
        artifactsBatches.push(artifactBatch);
    }
    if (iteration == MAX_ITERATIONS) {
        console.log();
        console.log("Could not figure out full dependancy model for these artifacts. Check template for correctness.");
        console.log("-----------------------------------------------------------------------------------------------");
        for (var res = 0; res < artifacts.length; res++) {
            if (!checkIfArtifactExists(artifacts[res], artifactsOrdered)) {
                console.log(`Name: ${artifacts[res].name}, Type: ${artifacts[res].type}`);
                let dependancies = artifacts[res].dependson;
                dependancies.forEach((dep) => {
                    if (!checkIfNameExists(dep, artifactsOrdered)) {
                        console.log(`    Dependency Not found: ${dep}`);
                    }
                });
            }
        }
        console.log("-----------------------------------------------------------------------------------------------");
        throw new Error("Could not figure out full dependancy model. Some dependancies may not exist in template.");
    }
    console.log("Complete getting Artifacts From Template");
    return artifactsBatches;
}
function convertIpynb2Payload(payloadObj) {
    console.log('Converting payload');
    let payload = {
        "name": (0, uuid_1.v4)(),
        "properties": {
            "nbformat": 4,
            "nbformat_minor": 2,
            "bigDataPool": {
                "referenceName": "testProd5",
                "type": "BigDataPoolReference"
            },
            "sessionProperties": {
                "driverMemory": "28g",
                "driverCores": 4,
                "executorMemory": "28g",
                "executorCores": 4,
                "numExecutors": 2
            },
            "metadata": payloadObj['metadata'],
            "cells": payloadObj['cells']
        }
    };
    return JSON.stringify(payload);
}
function checkIfNameExists(nameToCheck, selectedListOfResources) {
    if (nameToCheck.indexOf(`/`) != 0) {
        nameToCheck = `/` + nameToCheck;
    }
    if (nameToCheck.toLowerCase().indexOf(`/managedvirtualnetworks/`) > -1 ||
        nameToCheck.toLowerCase().indexOf(`/sqlpools/`) > -1 ||
        nameToCheck.toLowerCase().indexOf(`/bigdatapools/`) > -1 ||
        nameToCheck.toLowerCase().indexOf(`/managedprivateendpoints/`) > -1) {
        return true;
    }
    for (var res = 0; res < selectedListOfResources.length; res++) {
        let resource = selectedListOfResources[res];
        let resName = resource.name;
        let restype = resource.type;
        if (restype.indexOf("Microsoft.Synapse/workspaces/") > -1) {
            restype = restype.substr("Microsoft.Synapse/workspaces/".length);
        }
        if (resName.toLowerCase() == nameToCheck.toLowerCase() ||
            (nameToCheck.toLowerCase().indexOf('/' + restype.toLowerCase() + '/' + resName.toLowerCase()) != -1 &&
                nameToCheck.toLowerCase().indexOf('/' + restype.toLowerCase() + '/' + resName.toLowerCase()) + restype.length + resName.length == nameToCheck.length - 2)) {
            return true;
        }
    }
    return false;
}
function checkIfArtifactExists(resourceToCheck, selectedListOfResources) {
    for (var res = 0; res < selectedListOfResources.length; res++) {
        let resource = selectedListOfResources[res];
        if (resource.name == resourceToCheck.name && resource.type == resourceToCheck.type) {
            return true;
        }
    }
    return false;
}
function getDependentsFromArtifact(artifactContent) {
    let dependants = new Array();
    let artifact = JSON.parse(artifactContent);
    if (artifactContent.indexOf(`dependsOn`) > -1 && artifact[`dependsOn`] != null) {
        artifact[`dependsOn`].forEach((x) => {
            dependants.push(x);
        });
    }
    return dependants;
}
//# sourceMappingURL=armtemplateutils.js.map