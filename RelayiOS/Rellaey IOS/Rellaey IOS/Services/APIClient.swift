//
//  APIClient.swift
//  Rellaey IOS
//

import Foundation

actor APIClient {
    static let shared = APIClient()
    private let supabaseURL: URL
    private let auth: () -> [String: String]

    init(
        supabaseURL: String = Config.supabaseURL,
        authHeader: @escaping () -> [String: String] = {
            var h: [String: String] = ["apikey": Config.supabaseAnonKey]
            if let t = UserDefaults.standard.string(forKey: "supabase_access_token") {
                h["Authorization"] = "Bearer \(t)"
            }
            return h
        }
    ) {
        self.supabaseURL = URL(string: supabaseURL)!
        self.auth = authHeader
    }

    func fetchGadgets(category: String? = nil, limit: Int = 50) async throws -> [Gadget] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/gadgets"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "status", value: "eq.available"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "limit", value: String(limit)),
            URLQueryItem(name: "select", value: "id,status,name,brand,category,credits,condition,specs,description,color,carrier,verification_code,image_urls,city,state,latitude,longitude,profile_id,pickup_locations,created_at,profiles(display_name,avatar_url,rating,membership_tier,created_at)")
        ]
        if let cat = category, !cat.isEmpty, cat != "Explore" {
            comp.queryItems?.append(URLQueryItem(name: "category", value: "eq.\(cat)"))
        }
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        let rows = try JSONDecoder().decode([SupabaseGadgetRow].self, from: data)
        return rows.map { Gadget(from: $0) }
    }

    /// Calls the Next.js API to get or create a conversation for a gadget.
    /// Returns the conversationId string.
    func getOrCreateConversation(gadgetId: String, sellerProfileId: String) async throws -> String {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/conversations/get-or-create") else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = UserDefaults.standard.string(forKey: "supabase_access_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = try JSONEncoder().encode(["gadgetId": gadgetId, "sellerProfileId": sellerProfileId])
        let (data, response) = try await URLSession.shared.data(for: req)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        let result = try JSONDecoder().decode([String: String].self, from: data)
        guard let convId = result["conversationId"] else { throw URLError(.cannotParseResponse) }
        return convId
    }

    func fetchListing(id: String) async throws -> Gadget? {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/gadgets"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(id)"),
            URLQueryItem(name: "select", value: "id,status,name,brand,category,credits,condition,specs,description,color,carrier,verification_code,image_urls,city,state,latitude,longitude,profile_id,pickup_locations,created_at,profiles(display_name,avatar_url,rating,membership_tier,created_at)")
        ]
        guard let url = comp.url else { return nil }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        let rows = try JSONDecoder().decode([SupabaseGadgetRow].self, from: data)
        guard let row = rows.first else { return nil }
        return Gadget(from: row)
    }

    // MARK: - My Listings
    func fetchMyListings(profileId: String) async throws -> [Gadget] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/gadgets"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "profile_id", value: "eq.\(profileId)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "select", value: "id,status,name,brand,category,credits,condition,specs,description,color,carrier,verification_code,image_urls,city,state,latitude,longitude,profile_id,pickup_locations,created_at,profiles(display_name,avatar_url,rating,membership_tier,created_at)")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        let rows = try JSONDecoder().decode([SupabaseGadgetRow].self, from: data)
        return rows.map { Gadget(from: $0) }
    }

    // MARK: - Wishlist (fetch gadgets by IDs)
    func fetchGadgetsByIds(_ ids: [String]) async throws -> [Gadget] {
        guard !ids.isEmpty else { return [] }
        let idsParam = "(\(ids.joined(separator: ",")))"
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/gadgets"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "id", value: "in.\(idsParam)"),
            URLQueryItem(name: "select", value: "id,status,name,brand,category,credits,condition,specs,description,color,carrier,verification_code,image_urls,city,state,latitude,longitude,profile_id,pickup_locations,created_at,profiles(display_name,avatar_url,rating,membership_tier,created_at)")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        let rows = try JSONDecoder().decode([SupabaseGadgetRow].self, from: data)
        return rows.map { Gadget(from: $0) }
    }

    // MARK: - Conversations
    func fetchConversations(profileId: String) async throws -> [Conversation] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/conversations"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "or", value: "(buyer_profile_id.eq.\(profileId),seller_profile_id.eq.\(profileId))"),
            URLQueryItem(name: "order", value: "updated_at.desc"),
            URLQueryItem(name: "select", value: "id,gadget_id,buyer_profile_id,seller_profile_id,updated_at,gadgets(name,image_urls),buyer_profile:profiles!conversations_buyer_profile_id_fkey(id,display_name,avatar_url),seller_profile:profiles!conversations_seller_profile_id_fkey(id,display_name,avatar_url)")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        let rows = try JSONDecoder().decode([SupabaseConversationRow].self, from: data)
        return rows.map { $0.toConversation(currentUserId: profileId) }
    }

    // MARK: - Messages
    func fetchMessages(conversationId: String) async throws -> [ChatMessage] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/messages"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "conversation_id", value: "eq.\(conversationId)"),
            URLQueryItem(name: "order", value: "created_at.asc"),
            URLQueryItem(name: "select", value: "id,conversation_id,sender_profile_id,content,read_at,created_at")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        let rows = try JSONDecoder().decode([SupabaseMessageRow].self, from: data)
        return rows.map { ChatMessage(id: $0.id, senderId: $0.senderProfileId, body: $0.content, createdAt: $0.createdAt, readAt: $0.readAt) }
    }

    func sendMessage(conversationId: String, content: String, senderProfileId: String) async throws -> ChatMessage {
        let url = supabaseURL.appendingPathComponent("rest/v1/messages")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("return=representation", forHTTPHeaderField: "Prefer")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let body: [String: String] = [
            "conversation_id": conversationId,
            "sender_profile_id": senderProfileId,
            "content": content
        ]
        req.httpBody = try JSONEncoder().encode(body)
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 201 else { throw URLError(.badServerResponse) }
        let rows = try JSONDecoder().decode([SupabaseMessageRow].self, from: data)
        guard let row = rows.first else { throw URLError(.cannotParseResponse) }
        return ChatMessage(id: row.id, senderId: row.senderProfileId, body: row.content, createdAt: row.createdAt, readAt: row.readAt)
    }

    // MARK: - Swaps
    func fetchSwaps(profileId: String) async throws -> [Swap] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/swaps"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "or", value: "(buyer_profile_id.eq.\(profileId),seller_profile_id.eq.\(profileId))"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "select", value: "id,gadget_id,buyer_profile_id,seller_profile_id,credits_amount,status,pickup_arranged_at,completed_at,created_at,updated_at,gadgets(name,brand,image_urls),buyer_profile:profiles!swaps_buyer_profile_id_fkey(id,display_name,avatar_url),seller_profile:profiles!swaps_seller_profile_id_fkey(id,display_name,avatar_url)")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        return (try? JSONDecoder().decode([Swap].self, from: data)) ?? []
    }

    // MARK: - Transactions / Wallet
    func fetchTransactions(profileId: String) async throws -> [Transaction] {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/transactions"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "profile_id", value: "eq.\(profileId)"),
            URLQueryItem(name: "order", value: "created_at.desc"),
            URLQueryItem(name: "select", value: "*")
        ]
        guard let url = comp.url else { return [] }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return [] }
        return (try? JSONDecoder().decode([Transaction].self, from: data)) ?? []
    }

    // MARK: - Profile
    func fetchProfile(userId: String) async throws -> Profile? {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/profiles"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(userId)"),
            URLQueryItem(name: "select", value: "*")
        ]
        guard let url = comp.url else { return nil }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        let profiles = try JSONDecoder().decode([Profile].self, from: data)
        return profiles.first
    }

    func fetchProfileByUsername(_ username: String) async throws -> Profile? {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/profiles"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [
            URLQueryItem(name: "display_name", value: "eq.\(username)"),
            URLQueryItem(name: "select", value: "*")
        ]
        guard let url = comp.url else { return nil }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        let (data, res) = try await URLSession.shared.data(for: req)
        guard (res as? HTTPURLResponse)?.statusCode == 200 else { return nil }
        let profiles = try JSONDecoder().decode([Profile].self, from: data)
        return profiles.first
    }

    func updateProfile(userId: String, displayName: String?, bio: String?) async throws {
        var comp = URLComponents(url: supabaseURL.appendingPathComponent("rest/v1/profiles"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [URLQueryItem(name: "id", value: "eq.\(userId)")]
        guard let url = comp.url else { throw URLError(.badURL) }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("return=minimal", forHTTPHeaderField: "Prefer")
        for (k, v) in auth() { req.setValue(v, forHTTPHeaderField: k) }
        var body: [String: String?] = [:]
        if let name = displayName { body["display_name"] = name }
        if let b = bio { body["bio"] = b }
        req.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 })
        let (_, res) = try await URLSession.shared.data(for: req)
        guard let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}

// MARK: - Supabase raw row types

struct SupabaseConversationRow: Decodable {
    let id: String
    let gadgetId: String?
    let buyerProfileId: String
    let sellerProfileId: String
    let updatedAt: String?
    let gadget: ConvGadgetEmbed?
    let buyerProfile: ConvProfileEmbed?
    let sellerProfile: ConvProfileEmbed?

    enum CodingKeys: String, CodingKey {
        case id
        case gadgetId = "gadget_id"
        case buyerProfileId = "buyer_profile_id"
        case sellerProfileId = "seller_profile_id"
        case updatedAt = "updated_at"
        case gadget = "gadgets"
        case buyerProfile = "buyer_profile"
        case sellerProfile = "seller_profile"
    }

    func toConversation(currentUserId: String) -> Conversation {
        let otherEmbed = buyerProfileId == currentUserId ? sellerProfile : buyerProfile
        let otherProfile = otherEmbed.map {
            Profile(id: $0.id, displayName: $0.displayName, avatarUrl: $0.avatarUrl,
                    bio: nil, rating: nil, ratingCount: nil, membershipTier: nil, createdAt: nil)
        }
        return Conversation(
            id: id,
            lastMessage: gadget?.name,
            lastMessageAt: updatedAt,
            unreadCount: nil,
            otherUser: otherProfile,
            listingTitle: gadget?.name
        )
    }
}

struct ConvGadgetEmbed: Decodable {
    let name: String?
    let imageUrls: [String]?
    enum CodingKeys: String, CodingKey {
        case name
        case imageUrls = "image_urls"
    }
}

struct ConvProfileEmbed: Decodable {
    let id: String
    let displayName: String?
    let avatarUrl: String?
    enum CodingKeys: String, CodingKey {
        case id
        case displayName = "display_name"
        case avatarUrl = "avatar_url"
    }
}

struct SupabaseMessageRow: Decodable {
    let id: String
    let conversationId: String
    let senderProfileId: String
    let content: String
    let readAt: String?
    let createdAt: String
    enum CodingKeys: String, CodingKey {
        case id
        case conversationId = "conversation_id"
        case senderProfileId = "sender_profile_id"
        case content
        case readAt = "read_at"
        case createdAt = "created_at"
    }
}
