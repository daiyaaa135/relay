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
                // Deep link handler for password-reset and email-confirmation links.
                // Spec: com.rellay.app://reset-password#access_token=...&type=recovery
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }

    // MARK: - Deep Link Handling

    /// Parses Supabase auth deep links from the custom URL scheme.
    ///
    /// Supabase embeds tokens in the URL fragment (#), e.g.:
    ///   com.rellay.app://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
    private func handleDeepLink(_ url: URL) {
        guard let fragment = url.fragment else { return }

        var params: [String: String] = [:]
        for pair in fragment.split(separator: "&") {
            let parts = pair.split(separator: "=", maxSplits: 1)
            if parts.count == 2 {
                params[String(parts[0])] = String(parts[1])
                    .removingPercentEncoding ?? String(parts[1])
            }
        }

        let type        = params["type"] ?? ""
        let accessToken = params["access_token"] ?? ""
        let refreshToken = params["refresh_token"]

        guard !accessToken.isEmpty else { return }

        if type == "recovery" {
            // Password-reset link — store recovery session, then show ResetPasswordView
            auth.setRecoverySession(accessToken: accessToken, refreshToken: refreshToken)
            appState.pendingDeepLink = .resetPassword
        } else if type == "signup" || type == "magiclink" {
            // Email confirmation link — hydrate session, mark as authenticated
            auth.setRecoverySession(accessToken: accessToken, refreshToken: refreshToken)
            Task {
                await auth.fetchProfile()
                await MainActor.run { auth.isAuthenticated = auth.currentUser != nil }
            }
        }
    }
}
