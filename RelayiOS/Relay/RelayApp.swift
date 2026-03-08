//
//  RelayApp.swift
//  Relay
//
//  Native iOS app for Relay — gadget swapping marketplace.
//

import SwiftUI

@main
struct RelayApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var appState = AppState.shared

    var body: some Scene {
        // #region agent log
        DebugLog.log(location: "RelayApp.swift:body", message: "RelayApp body evaluated", data: [:], hypothesisId: "H3")
        // #endregion agent log
        return WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(appState)
        }
    }
}
