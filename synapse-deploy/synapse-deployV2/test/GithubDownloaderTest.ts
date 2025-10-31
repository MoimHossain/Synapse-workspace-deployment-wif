import * as mockery from "mockery";
import chai = require('chai');
import { mock, instance, when, anyString, anything } from 'ts-mockito';
import { GithubFileDownloader } from "../GithubFileDownloader";
import { EndpointAuthorization } from 'azure-pipelines-task-lib';
import * as httpClient from 'typed-rest-client/HttpClient';
import { IncomingMessage } from "http";

var chaiAsPromised = require("chai-as-promised");
const fs = require('fs');
var should = chai.should();

chai.use(chaiAsPromised);

var AdmZip = require('adm-zip');

describe('Githubdownloader tests', function () {

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
                parameters: { "apitoken": "sometoken", "AccessToken": "myToken" },
                scheme: "Token"
            },
            getEndpointAuthorizationScheme: (key: string, optional: boolean): string => "token"
        };
        mockery.registerMock('azure-pipelines-task-lib/task', mockTask);

        let githubFileDownloader =
            new GithubFileDownloader("myrepo", "mybranch");

        let token = githubFileDownloader.getEndPointToken("test");
        token.should.equals('myToken');
        done();
    });
    
    it('getDownloadFilesURL should succeed with PersonalAccessToken', function (done: Mocha.Done) {
        let mockTask = {
            debug: () => { },
            getDelimitedInput: (key: string) => ["tokenendpoint1"],
            getEndpointUrl: (key: string, optional: boolean) => "https://contoso.com/nuget/v3/index.json",
            getEndpointAuthorization: (key: string, optional: boolean) => <EndpointAuthorization>{
                parameters: { "apitoken": "sometoken", "accessToken": "myPersonalAccessToken" },
                scheme: "PersonalAccessToken"
            },
            getEndpointAuthorizationScheme: (key: string, optional: boolean): string => "token"
        };
        mockery.registerMock('azure-pipelines-task-lib/task', mockTask);

        let githubFileDownloader = new GithubFileDownloader("", "");
        let token = githubFileDownloader.getEndPointToken("");
        token.should.equals('myPersonalAccessToken');
        done();
    });

    it('getDownloadFilesURL should succeed with OAuth', function (done: Mocha.Done) {
        let mockTask = {
            debug: () => { },
            getDelimitedInput: (key: string) => ["tokenendpoint1"],
            getEndpointUrl: (key: string, optional: boolean) => "https://contoso.com/nuget/v3/index.json",
            getEndpointAuthorization: (key: string, optional: boolean) => <EndpointAuthorization>{
                parameters: { "apitoken": "sometoken", "AccessToken": "myOAuth" },
                scheme: "OAuth"
            },
            getEndpointAuthorizationScheme: (key: string, optional: boolean): string => "token"
        };
        mockery.registerMock('azure-pipelines-task-lib/task', mockTask);

        let githubFileDownloader = new GithubFileDownloader("", "");
        let token = githubFileDownloader.getEndPointToken("");
        token.should.equals('myOAuth');
        done();
    });

    it('getDownloadFiles should succeed', function (done: Mocha.Done) {
        var stream: any;
        var mockedfs = {
            createWriteStream(filePath: string, options?: any) {
                stream = fs.createWriteStream(filePath);
                return stream;
            },

            writeFileSync: fs.writeFileSync,
        };

        mockery.registerMock('fs', mockedfs);

        var downloader = new GithubFileDownloader('', '');
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

    it('extract file should succeed', function (done: Mocha.Done) {

        var downloader = new GithubFileDownloader('', '');
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
