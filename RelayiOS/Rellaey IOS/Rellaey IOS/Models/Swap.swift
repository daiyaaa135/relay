//
//  Swap.swift
//  Rellaey IOS
//

import Foundation

struct Swap: Identifiable, Codable {
    let id: String
    let gadgetId: String
    let buyerProfileId: String
    let sellerProfileId: String
    let creditsAmount: Int
    var status: String          // pending | confirmed | pickup_arranged | completed | cancelled
    var pickupArrangedAt: String?
    var completedAt: String?
    let createdAt: String?
    var updatedAt: String?

    // Embedded from Supabase joins
    var gadget: SwapGadgetEmbed?
    var buyerProfile: SwapProfileEmbed?
    var sellerProfile: SwapProfileEmbed?

    enum CodingKeys: String, CodingKey {
        case id
        case gadgetId = "gadget_id"
        case buyerProfileId = "buyer_profile_id"
        case sellerProfileId = "seller_profile_id"
        case creditsAmount = "credits_amount"
        case status
        case pickupArrangedAt = "pickup_arranged_at"
        case completedAt = "completed_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case gadget = "gadgets"
        case buyerProfile = "buyer_profile"
        case sellerProfile = "seller_profile"
    }
}

struct SwapGadgetEmbed: Codable {
    let name: String?
    let brand: String?
    let imageUrls: [String]?

    enum CodingKeys: String, CodingKey {
        case name, brand
        case imageUrls = "image_urls"
    }
}

struct SwapProfileEmbed: Codable {
    let id: String
    let displayName: String?
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

extension Swap {
    /// Status label for UI display
    var statusLabel: String {
        switch status {
        case "pending":          return "Pending"
        case "confirmed":        return "Confirmed"
        case "pickup_arranged":  return "Pickup Set"
        case "completed":        return "Completed"
        case "cancelled":        return "Cancelled"
        default:                 return status.capitalized
        }
    }

    var statusColor: String {
        switch status {
        case "pending":          return "fair"
        case "confirmed":        return "good"
        case "pickup_arranged":  return "mint"
        case "completed":        return "new"
        case "cancelled":        return "poor"
        default:                 return "good"
        }
    }

    var isActive: Bool {
        status != "completed" && status != "cancelled"
    }
}
