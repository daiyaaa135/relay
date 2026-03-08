//
//  Message.swift
//  Relay
//

import Foundation

struct Conversation: Identifiable, Codable {
    let id: String
    var lastMessage: String?
    var lastMessageAt: String?
    var unreadCount: Int?
    var otherUser: Profile?
    var listingTitle: String?
}

struct ChatMessage: Identifiable, Codable {
    let id: String
    let senderId: String
    let body: String
    let createdAt: String
    var readAt: String?
}
