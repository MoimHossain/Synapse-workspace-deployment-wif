"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageFileDownloader = void 0;
class PackageFileDownloader {
    constructor(packageFiles) {
        this.task = require('azure-pipelines-task-lib/task');
        this.fs = require("fs");
        this.packageFiles = packageFiles;
    }
    escapeBlockCharacters(str) {
        return str.replace(/[\[]/g, '$&[]');
    }
    getPackageFiles() {
        var parametersFileContent = this.getPackageFileContent(this.packageFiles.parametersFile);
        var templateFileContent = this.getPackageFileContent(this.packageFiles.templateFile);
        return {
            templateFileContent: templateFileContent,
            parametersFileContent: parametersFileContent
        };
    }
    getPackageFileContent(fileName) {
        var fileContent = "";
        var fileMatches = this.task.findMatch(this.task.getVariable("System.DefaultWorkingDirectory"), this.escapeBlockCharacters(fileName));
        if (fileMatches.length > 1) {
            throw new Error("Found more than one file with same pattern");
        }
        else if (fileMatches.length < 1) {
            throw new Error("No file found with this pattern");
        }
        var filePath = fileMatches[0];
        if (!this.fs.lstatSync(filePath).isDirectory()) {
            this.task.debug("Reading file " + filePath);
            try {
                fileContent = this.fs.readFileSync(filePath, 'utf8');
            }
            catch (error) {
                throw new Error("Failed to read file" + filePath);
            }
            this.task.debug("Successfully read the file" + filePath);
        }
        else {
            throw new Error("Input file path instead of directory");
        }
        return fileContent;
    }
}
exports.PackageFileDownloader = PackageFileDownloader;
//# sourceMappingURL=PackageFileDownloader.js.map