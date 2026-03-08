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
    var membershipTier: String?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
        case bio
        case rating
        case ratingCount = "rating_count"
        case membershipTier = "membership_tier"
        case createdAt = "created_at"
    }
}
