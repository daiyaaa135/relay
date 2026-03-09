//
//  Profile.swift
//  Rellaey IOS
//

import Foundation

struct Profile: Identifiable, Codable {
    let id: String
    var displayName: String?
    var avatarUrl: String?
    var bio: String?
    var rating: Double?
    var ratingCount: Int?
    var membershipTier: String?     // "guest" | "relay_plus"
    var creditsBalance: Int?
    var createdAt: String?
    // Notification preferences (DB columns added in migrations 20241103)
    var notifyMessages: Bool?
    var notifySwaps: Bool?
    var notifyPickup30Min: Bool?
    var notifyPickup15Min: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName        = "display_name"
        case avatarUrl          = "avatar_url"
        case bio
        case rating
        case ratingCount        = "rating_count"
        case membershipTier     = "membership_tier"
        case creditsBalance     = "credits_balance"
        case createdAt          = "created_at"
        case notifyMessages     = "notify_messages"
        case notifySwaps        = "notify_swaps"
        case notifyPickup30Min  = "notify_pickup_30_min"
        case notifyPickup15Min  = "notify_pickup_15_min"
    }
}
