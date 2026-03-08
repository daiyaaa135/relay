//
//  AppState.swift
//  Relay
//

import Foundation
import Combine

@MainActor
final class AppState: ObservableObject {
    static let shared = AppState()

    @Published var selectedTab: Tab = .home
    @Published var wishlistIds: Set<String> = []
    @Published var unreadMessageCount: Int = 0

    enum Tab: String, CaseIterable {
        case home
        case wishlist
        case swap
        case messages
        case more
    }
}
