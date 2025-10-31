export interface PackageFiles {
    templateFile: string,
    parametersFile: string
}

export interface PackageFilesContent {
    templateFileContent: string,
    parametersFileContent: string
}

export class PackageFileDownloader {
    task = require('azure-pipelines-task-lib/task');
    fs = require("fs");
    packageFiles: PackageFiles;
    constructor(packageFiles: PackageFiles) {
        this.packageFiles = packageFiles;
    }
    private escapeBlockCharacters(str: string): string {
        return str.replace(/[\[]/g, '$&[]');
    }

    public getPackageFiles() :PackageFilesContent {
        var parametersFileContent = this.getPackageFileContent(this.packageFiles.parametersFile);
        var templateFileContent = this.getPackageFileContent(this.packageFiles.templateFile);
        return {
            templateFileContent: templateFileContent,
            parametersFileContent: parametersFileContent
        };
    }

    private getPackageFileContent(fileName: string) {
        var fileContent = "";
        var fileMatches = this.task.findMatch(this.task.getVariable("System.DefaultWorkingDirectory"),
            this.escapeBlockCharacters(fileName));
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
        } else {
            throw new Error("Input file path instead of directory");
        }
        return fileContent;
    }
}