//
//  Rellaey_IOSApp.swift
//  Rellaey IOS
//
//  Created by Serena Chan on 3/8/26.
//

import SwiftUI

@main
struct Rellaey_IOSApp: App {
    @StateObject private var auth = AuthService.shared
    @StateObject private var appState = AppState.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(appState)
        }
    }
}
