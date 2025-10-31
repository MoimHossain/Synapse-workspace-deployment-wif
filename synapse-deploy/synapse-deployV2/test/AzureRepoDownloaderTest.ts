import * as mockery from "mockery";
import chai = require('chai');
import { mock, instance, when, anyString, anything } from 'ts-mockito';
import * as httpClient from 'typed-rest-client/HttpClient';
import { AzureRepoFileDownloader } from "../AzureRepoFileDownloader";
import { IncomingMessage, STATUS_CODES } from "http";
import { EndpointAuthorization } from "azure-pipelines-task-lib";
const fs = require('fs');

var AdmZip = require('adm-zip');
var chaiAsPromised = require("chai-as-promised");
var should = chai.should();

chai.use(chaiAsPromised);

describe('Azure Repo downloader tests', function () {

    before(() => {
        mockery.disable(); // needed to ensure that we can mock vsts-task-lib/task
        mockery.enable({
            useCleanCache: true,
            warnOnUnregistered: true
        } as mockery.MockeryEnableArgs);
    });

    after(() => {
        mockery.disable();
    });

    beforeEach(() => {
        mockery.resetCache();
        mockery.registerMock('azure-pipelines-task-lib/task', {});
    });

    afterEach(() => {
        mockery.deregisterAll();
    });

    it('getDownloadFilesURL should succeed with token', function (done: Mocha.Done) {
        let mockTask = {
            debug: () => { },
            getDelimitedInput: (key: string) => ["tokenendpoint1"],
            getEndpointUrl: (key: string, optional: boolean) => "",
            getEndpointAuthorization: (key: string, optional: boolean) => <EndpointAuthorization>{
                parameters: { "apitoken": "sometoken", "accessToken": "myToken" },
                scheme: "Token"
            },
            getEndpointAuthorizationScheme: (key: string, optional: boolean): string => "token"
        };
        mockery.registerMock('azure-pipelines-task-lib/task', mockTask);

        let arFileDownloader =
            new AzureRepoFileDownloader("myrepo", "mybranch", "", "");

        let token = arFileDownloader.getEndPointToken("test");
        token.should.equals('sometoken');
        done();
    });

    it('getDownloadFiles should succeed', function (done: Mocha.Done) {
        var stream: any;
        var mockedfs = {
            createWriteStream(filePath: string, options?: any) {
                stream = fs.createWriteStream(filePath);
                return stream;
            },
        };
        mockery.registerMock('fs', mockedfs);


        var downloader = new AzureRepoFileDownloader('', '', '', '');
        let mockedClient: httpClient.HttpClient = mock(httpClient.HttpClient);
        let client: httpClient.HttpClient = instance(mockedClient);
        var mockedMessage = mock(IncomingMessage);
        mockedMessage.statusCode = 200;

        var mockedResponse = mock(httpClient.HttpClientResponse);
        mockedResponse.message = mockedMessage;
        when(mockedClient.get(anyString(), anything())).thenResolve(mockedResponse);

        var test = downloader.downloadFiles('..', 'myToken', client);
        stream.end();
        test.should.eventually.be.fulfilled;
        done();
    });

    it('getDownloadFiles should failed', function (done: Mocha.Done) {
        var stream: any;
        var mockedfs = {
            createWriteStream(filePath: string, options?: any) {
                stream = fs.createWriteStream(filePath);
                return stream;
            },
        };

        mockery.registerMock('fs', mockedfs);

        var downloader = new AzureRepoFileDownloader('', '', '', '');
        let mockedClient: httpClient.HttpClient = mock(httpClient.HttpClient);
        let client: httpClient.HttpClient = instance(mockedClient);
        when(mockedClient.get(anyString(), anything())).thenThrow(new Error(''));

        var downloadStatus = downloader.downloadFiles('..', 'myToken', client);
        stream.end();
        downloadStatus.should.eventually.be.rejected;
        done();
    });

    it('extract file should succeed', function (done: Mocha.Done) {

        var downloader = new AzureRepoFileDownloader('', '', '', '');
        var zip = new AdmZip();
        var content = "inner content of the file";
        zip.addFile("template.json", Buffer.alloc(content.length, content), "entry comment goes here");
        zip.writeZip("synapse.zip");
        var fileArr = downloader.extractFiles('.', 'template');

        fileArr.should.eventually.be.fulfilled;
        fileArr.should.eventually.be.length(1);
        done();
    });
});
