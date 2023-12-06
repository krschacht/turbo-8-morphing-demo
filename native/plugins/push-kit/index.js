const { withPlugins, withAppDelegate, ConfigPlugin,
    withEntitlementsPlist,
    IOSConfig,
    withXcodeProject,
    XcodeProject, } = require('@expo/config-plugins');
const { basename, resolve } = require('path');
const { copyFileSync } = require('fs');

function withPushKitAppDelegateImport(config) {
    return withAppDelegate(config, (cfg) => {
        const { modResults } = cfg;
        const { contents } = modResults;
        const lines = contents.split('\n');

        const importIndex = lines.findIndex((line) =>
            /^#import "AppDelegate.h"/.test(line)
        );

        modResults.contents = [
            ...lines.slice(0, importIndex + 1),
            '#import <PushKit/PushKit.h>',
            '#import "RNVoipPushNotificationManager.h"',
            '#import "RNCallKeep.h"',

            ...lines.slice(importIndex + 1),
        ].join('\n');

        return cfg;
    });
}

function withPushKitAppDelegateSetUpCallKeep(config) {
    return withAppDelegate(config, (cfg) => {
        const { modResults } = cfg;
        const { contents } = modResults;
        const lines = contents.split('\n');

        const launchMethodIndex = lines.findIndex((line) =>
            /didFinishLaunchingWithOptions/.test(line)
        );

        modResults.contents = [
            ...lines.slice(0, launchMethodIndex + 2),
            '  [RNCallKeep setup:@{\n' +
            '    @"appName": @"Lava",\n' +
            '    @"imageName": @"icn-call-kit.png",\n' +
            '    @"ringtoneSound": @"incoming.m4a",\n' +
            '    @"maximumCallGroups": @1,\n' +
            '    @"maximumCallsPerCallGroup": @1,\n' +
            '    @"supportsVideo": @YES,\n' +
            '    @"includesCallsInRecents": @NO,\n' +
            '  }];\n',
            ...lines.slice(launchMethodIndex + 2),
        ].join('\n');

        return cfg;
    });
}

function withPushKitAppDelegateMethods(config) {
    return withAppDelegate(config, (cfg) => {
        const { modResults } = cfg;
        const { contents } = modResults;
        const lines = contents.split('\n');

        const bridgeIndex = lines.findIndex((line) =>
            /\\extraModulesForBridge/.test(line)
        );

        modResults.contents = [
            ...lines.slice(0, bridgeIndex - 1),
            '// --- Handle updated push credentials\n' +
            '- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {\n' +
            '  // Register VoIP push token (a property of PKPushCredentials) with server\n' +
            '  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];\n' +
            '}\n' +
            '\n' +
            '// --- Handle incoming pushes\n' +
            '- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {\n' +
            '  NSDictionary* call = payload.dictionaryPayload[@"call"];\n' +
            '  if (call == nil) return;\n' +
            '  NSString *uuid = call[@"key"];\n' +
            '  NSString *username = call[@"started_by_person_user_name"];\n' +
            '  [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];\n' +
            '  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];\n' +
            '  [RNCallKeep reportNewIncomingCall:uuid handle:username handleType:@"generic" hasVideo:YES localizedCallerName:username supportsHolding:NO supportsDTMF:NO supportsGrouping:NO supportsUngrouping:NO fromPushKit:YES payload:payload.dictionaryPayload withCompletionHandler:nil];\n' +
            '}\n',
            ...lines.slice(bridgeIndex - 1),
        ].join('\n');

        return cfg;
    });
}

function withPushKitImage(config) {
    return withXcodeProject(config, (config) => {
        const projectRoot = config.modRequest.projectRoot;
        let project = config.modResults;
        const projectName = config.modRequest.projectName;

        const sourceRoot = IOSConfig.Paths.getSourceRoot(projectRoot);
        const fileName = 'icn-call-kit.png'
        const sourceFilepath = resolve(projectRoot, './app/assets/icn-call-kit.png')
        const destinationFilepath = resolve(sourceRoot, fileName);

        copyFileSync(sourceFilepath, destinationFilepath);
        if (!project.hasFile(`${projectName}/${fileName}`)) {
            project = IOSConfig.XcodeUtils.addResourceFileToGroup({
                filepath: `${projectName}/${fileName}`,
                groupName: projectName,
                isBuildFile: true,
                project,
            });
        }
        return config;
    });
}

module.exports = function withPushKit(config) {
    return withPlugins(config, [
        withPushKitAppDelegateImport,
        withPushKitAppDelegateSetUpCallKeep,
        withPushKitAppDelegateMethods,
        withPushKitImage
    ]);
}
