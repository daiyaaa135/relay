//
//  RootView.swift
//  Rellaey IOS
//

import SwiftUI

// MARK: - Root
struct RootView: View {
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var appState: AppState
    @State private var showLogin = false

    private var showResetPassword: Binding<Bool> {
        Binding(
            get: { appState.pendingDeepLink == .resetPassword },
            set: { if !$0 { appState.pendingDeepLink = nil } }
        )
    }

    var body: some View {
        Group {
            if auth.isLoading {
                SplashScreen()
            } else if auth.isAuthenticated {
                MainTabView()
            } else if showLogin {
                LoginView()
            } else {
                WelcomeView(showLogin: $showLogin)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: auth.isAuthenticated)
        .animation(.easeInOut(duration: 0.2), value: showLogin)
        // Reset-password deep link: presented as a full-screen sheet regardless of auth state
        .sheet(isPresented: showResetPassword) {
            ResetPasswordView(isPresented: showResetPassword)
                .environmentObject(auth)
        }
    }
}

// MARK: - Splash
private struct SplashScreen: View {
    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()
            VStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(Color.relayPrimary.opacity(0.12))
                        .frame(width: 88, height: 88)
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundColor(.relayPrimary)
                }
                Text("Relay")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundColor(.relayPrimary)
            }
        }
    }
}

// MARK: - Custom Tab Bar
struct MainTabView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ZStack(alignment: .bottom) {
            // Page content — no native TabView chrome
            Group {
                switch appState.selectedTab {
                case .home:      HomeView()
                case .wishlist:  WishlistView()
                case .swap:      SwapView()
                case .messages:  MessagesView()
                case .more:      MoreView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            // Reserve space only when tab bar is visible
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: appState.tabBarVisible ? 80 : 0)
            }

            if appState.tabBarVisible {
                RelayTabBar()
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .ignoresSafeArea(edges: .bottom)
        .animation(.easeInOut(duration: 0.22), value: appState.tabBarVisible)
    }
}

// MARK: - Tab Bar
private struct RelayTabBar: View {
    @EnvironmentObject var appState: AppState

    private let items: [(tab: AppState.Tab, icon: String, label: String)] = [
        (.home,     "house.fill",                   "Home"),
        (.wishlist, "heart.fill",                   "Wishlist"),
        (.swap,     "arrow.triangle.2.circlepath",  "Swap"),
        (.messages, "message.fill",                 "Messages"),
        (.more,     "line.3.horizontal",            "More"),
    ]

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            ForEach(items, id: \.tab) { item in
                if item.tab == .swap {
                    // ── Elevated center Swap button ──
                    Button {
                        appState.selectedTab = .swap
                    } label: {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        colors: [
                                            Color(red: 1.0, green: 0.341, blue: 0.129),
                                            Color(red: 1.0, green: 0.537, blue: 0.0)
                                        ],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 54, height: 54)
                                .shadow(color: Color.relayPrimary.opacity(0.45), radius: 10, x: 0, y: 4)
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundColor(.white)
                        }
                        .offset(y: -16)
                    }
                    .frame(maxWidth: .infinity)
                } else {
                    // ── Regular tab item ──
                    Button {
                        appState.selectedTab = item.tab
                    } label: {
                        VStack(spacing: 4) {
                            ZStack(alignment: .topTrailing) {
                                Image(systemName: item.icon)
                                    .font(.system(size: 20, weight: appState.selectedTab == item.tab ? .semibold : .regular))
                                    .foregroundColor(
                                        appState.selectedTab == item.tab ? .relayPrimary : .relayMuted.opacity(0.7)
                                    )
                                    .frame(width: 28, height: 28)

                                // Unread badge for messages
                                if item.tab == .messages && appState.unreadMessageCount > 0 {
                                    Circle()
                                        .fill(Color.relayPrimary)
                                        .frame(width: 9, height: 9)
                                        .offset(x: 2, y: -2)
                                }
                            }

                            Text(item.label)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundColor(
                                    appState.selectedTab == item.tab ? .relayPrimary : .relayMuted.opacity(0.7)
                                )
                        }
                        .padding(.vertical, 10)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.bottom, 24)   // safe area approximate
        .background(
            ZStack {
                Rectangle()
                    .fill(.ultraThinMaterial)
                Rectangle()
                    .fill(Color.white.opacity(0.6))
            }
            .overlay(
                Rectangle()
                    .fill(Color.relayMuted.opacity(0.12))
                    .frame(height: 0.5),
                alignment: .top
            )
        )
    }
}
