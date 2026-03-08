//
//  AuthService.swift
//  Relay
//
//  Handles Supabase auth. Configure SUPABASE_URL and SUPABASE_ANON_KEY in Config.swift.
//

import Foundation
import Combine

@MainActor
final class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: Profile?
    @Published var isAuthenticated = false
    @Published var isLoading = true

    private let baseURL: URL
    private let anonKey: String
    private var session: AuthSession?

    struct AuthSession: Codable {
        let accessToken: String
        let refreshToken: String?
        let expiresAt: Double?
    }

    init() {
        self.baseURL = URL(string: Config.supabaseURL) ?? URL(string: "https://placeholder.supabase.co")!
        self.anonKey = Config.supabaseAnonKey
        // #region agent log
        DebugLog.log(location: "AuthService.swift:init", message: "AuthService init", data: [:], hypothesisId: "H5")
        // #endregion agent log
        Task { await restoreSession() }
    }

    func restoreSession() async {
        // #region agent log
        DebugLog.log(location: "AuthService.swift:restoreSession", message: "restoreSession start", data: ["isLoading": true], hypothesisId: "H1")
        // #endregion agent log
        isLoading = true
        defer {
            isLoading = false
            // #region agent log
            DebugLog.log(location: "AuthService.swift:restoreSession:defer", message: "restoreSession end", data: ["isLoading": false, "isAuthenticated": isAuthenticated], hypothesisId: "H1")
            // #endregion agent log
        }
        // Try stored session (implement with Keychain in production)
        if let _ = UserDefaults.standard.string(forKey: "supabase_access_token") {
            await fetchProfile()
            isAuthenticated = currentUser != nil
        } else {
            isAuthenticated = false
        }
    }

    func signIn(email: String, password: String) async throws {
        let url = baseURL.appendingPathComponent("auth/v1/token").appendingQueryItem("grant_type", value: "password")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(["email": email, "password": password])

        let (data, res) = try await URLSession.shared.data(for: req)
        guard let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw AuthError.signInFailed
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let accessToken = json?["access_token"] as? String {
            UserDefaults.standard.set(accessToken, forKey: "supabase_access_token")
            session = AuthSession(accessToken: accessToken, refreshToken: json?["refresh_token"] as? String, expiresAt: nil)
            await fetchProfile()
            isAuthenticated = true
        }
    }

    func signUp(email: String, password: String, displayName: String) async throws {
        let url = baseURL.appendingPathComponent("auth/v1/signup")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try JSONEncoder().encode([
            "email": email,
            "password": password,
            "options": ["data": ["display_name": displayName]]
        ])
        let (_, res) = try await URLSession.shared.data(for: req)
        guard let http = res as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw AuthError.signUpFailed
        }
        try await signIn(email: email, password: password)
    }

    func signOut() {
        UserDefaults.standard.removeObject(forKey: "supabase_access_token")
        session = nil
        currentUser = nil
        isAuthenticated = false
    }

    func fetchProfile() async {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else { return }
        // Get current user id from Supabase Auth
        let userURL = baseURL.appendingPathComponent("auth/v1/user")
        var userReq = URLRequest(url: userURL)
        userReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        userReq.setValue(anonKey, forHTTPHeaderField: "apikey")
        guard let (userData, userRes) = try? await URLSession.shared.data(for: userReq),
              let http = userRes as? HTTPURLResponse, http.statusCode == 200,
              let userJson = try? JSONSerialization.jsonObject(with: userData) as? [String: Any],
              let userId = userJson["id"] as? String else {
            currentUser = nil
            return
        }
        // Fetch profile by id (Supabase REST: ?id=eq.uuid&select=*)
        var comp = URLComponents(url: baseURL.appendingPathComponent("rest/v1/profiles"), resolvingAgainstBaseURL: false)!
        comp.queryItems = [URLQueryItem(name: "id", value: "eq.\(userId)"), URLQueryItem(name: "select", value: "*")]
        guard let profileURL = comp.url else { currentUser = nil; return }
        var profileReq = URLRequest(url: profileURL)
        profileReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        profileReq.setValue(anonKey, forHTTPHeaderField: "apikey")
        profileReq.setValue("application/json", forHTTPHeaderField: "Accept")
        do {
            let (data, _) = try await URLSession.shared.data(for: profileReq)
            let profiles = try JSONDecoder().decode([Profile].self, from: data)
            currentUser = profiles.first
        } catch {
            currentUser = nil
        }
    }

    var authHeader: [String: String] {
        guard let token = UserDefaults.standard.string(forKey: "supabase_access_token") else {
            return ["apikey": anonKey]
        }
        return [
            "apikey": anonKey,
            "Authorization": "Bearer \(token)"
        ]
    }
}

enum AuthError: LocalizedError {
    case signInFailed
    case signUpFailed
    var errorDescription: String? {
        switch self {
        case .signInFailed: return "Sign in failed"
        case .signUpFailed: return "Sign up failed"
        }
    }
}

extension URL {
    func appendingQueryItem(_ name: String, value: String) -> URL {
        var c = URLComponents(url: self, resolvingAgainstBaseURL: false)!
        c.queryItems = (c.queryItems ?? []) + [URLQueryItem(name: name, value: value)]
        return c.url ?? self
    }
}
