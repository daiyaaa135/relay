//
//  Gadget.swift
//  Rellaey IOS
//

import Foundation

struct Gadget: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let brand: String
    let category: String
    let credits: Int
    var status: String?
    let condition: String
    let specs: String
    var description: String?
    var color: String?
    var carrier: String?
    var verificationCode: String?
    let image: String
    var images: [String]?
    let seller: String
    var sellerAvatarUrl: String?
    var sellerId: String?
    let sellerRating: Double
    var sellerJoinedAt: String?
    var location: GadgetLocation?
    var latitude: Double?
    var longitude: Double?
    var pickupLocations: [PickupLocation]?
    var isMemberListing: Bool?
    var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, brand, category, credits, status, condition, specs, description
        case color, carrier, image, images, seller, sellerRating
        case sellerAvatarUrl = "seller_avatar_url"
        case sellerId = "seller_id"
        case sellerJoinedAt = "seller_joined_at"
        case location, latitude, longitude
        case pickupLocations = "pickup_locations"
        case isMemberListing = "is_member_listing"
        case verificationCode = "verification_code"
        case createdAt = "created_at"
    }
}

struct GadgetLocation: Codable, Hashable {
    let city: String
    let state: String
    let distance: Double
}

struct PickupLocation: Codable, Hashable {
    let city: String
    let state: String
    let latitude: Double
    let longitude: Double
    var displayName: String?

    enum CodingKeys: String, CodingKey {
        case city, state, latitude, longitude
        case displayName = "display_name"
    }
}

struct SupabaseGadgetRow: Decodable {
    let id: String
    let name: String
    let brand: String
    let category: String
    let credits: Int
    let status: String?
    let condition: String
    let specs: String?
    let description: String?
    let color: String?
    let carrier: String?
    let verificationCode: String?
    let imageUrls: [String]?
    let city: String?
    let state: String?
    let latitude: Double?
    let longitude: Double?
    let profileId: String?
    let pickupLocations: [PickupLocation]?
    let createdAt: String?
    let profiles: SupabaseProfileEmbed?

    enum CodingKeys: String, CodingKey {
        case id, name, brand, category, credits, status, condition, specs, description
        case color, carrier, city, state, latitude, longitude
        case imageUrls = "image_urls"
        case verificationCode = "verification_code"
        case profileId = "profile_id"
        case pickupLocations = "pickup_locations"
        case createdAt = "created_at"
        case profiles
    }
}

struct SupabaseProfileEmbed: Decodable {
    let displayName: String?
    let avatarUrl: String?
    let rating: Double?
    let membershipTier: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
        case rating
        case membershipTier = "membership_tier"
        case createdAt = "created_at"
    }
}

extension Gadget {
    init(from row: SupabaseGadgetRow) {
        let images = row.imageUrls ?? []
        let primaryImage = images.first ?? "https://placehold.co/600x800?text=No+Image"
        let profile = row.profiles
        id = row.id
        name = row.name
        brand = row.brand
        category = row.category
        credits = row.credits
        status = row.status
        condition = row.condition
        specs = row.specs ?? ""
        description = row.description
        color = row.color
        carrier = row.carrier
        verificationCode = row.verificationCode
        image = primaryImage
        self.images = images.isEmpty ? nil : images
        seller = profile?.displayName ?? "Unknown"
        sellerAvatarUrl = profile?.avatarUrl
        sellerId = row.profileId
        sellerRating = profile?.rating ?? 0
        sellerJoinedAt = profile?.createdAt
        if let c = row.city, let s = row.state {
            location = GadgetLocation(city: c, state: s, distance: 0)
        } else {
            location = nil
        }
        latitude = row.latitude
        longitude = row.longitude
        pickupLocations = row.pickupLocations
        isMemberListing = profile?.membershipTier == "relay_plus"
        createdAt = row.createdAt
    }
}
