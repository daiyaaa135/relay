//
//  RootView.swift
//  Relay
//

import SwiftUI

struct RootView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var appState: AppState

    var body: some View {
        // #region agent log
        let _ = {
            DebugLog.log(location: "RootView.swift:body", message: "RootView body", data: ["isLoading": auth.isLoading, "isAuthenticated": auth.isAuthenticated], hypothesisId: "H2")
        }()
        // #endregion agent log
        return Group {
            if auth.isLoading {
                ProgressView("Loading…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if auth.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
            }
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            HomeView()
                .tabItem { Label("Home", systemImage: "house") }
                .tag(AppState.Tab.home)

            WishlistView()
                .tabItem { Label("Wishlist", systemImage: "heart") }
                .tag(AppState.Tab.wishlist)

            SwapView()
                .tabItem { Label("Swap", systemImage: "arrow.triangle.2.circlepath") }
                .tag(AppState.Tab.swap)

            MessagesView()
                .tabItem {
                    Label("Messages", systemImage: appState.unreadMessageCount > 0 ? "message.badge.filled" : "message")
                }
                .tag(AppState.Tab.messages)

            MoreView()
                .tabItem { Label("More", systemImage: "line.3.horizontal") }
                .tag(AppState.Tab.more)
        }
        .tint(Color(red: 1, green: 0.34, blue: 0.13))
    }
}
