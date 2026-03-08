//
//  AppState.swift
//  Rellaey IOS
//

import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    @Published var selectedTab: Tab = .home
    @Published var wishlistIds: Set<String> = []
    @Published var unreadMessageCount: Int = 0
    /// Hide the custom tab bar (listing detail, chat thread)
    @Published var tabBarVisible: Bool = true
    /// Conversation ID to auto-open when switching to Messages tab
    @Published var pendingConversationId: String?

    enum Tab: String, CaseIterable {
        case home
        case wishlist
        case swap
        case messages
        case more
    }
}
