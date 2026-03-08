//
//  APIClient.swift
//  Relay
//
//  Fetches gadgets from Supabase (same as web app). Optionally use Next.js API for listing detail.
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

    /// Fetch gadgets from Supabase (same query shape as web app fetchGadgets)
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
}
