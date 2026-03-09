//
//  AuthService.swift
//  Rellaey IOS
//

import Foundation
import Combine
import Security
import AuthenticationServices
import CryptoKit

@MainActor
final class AuthService: NSObject, ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: Profile?
    @Published var isAuthenticated = false
    @Published var isLoading = true

    private let baseURL: URL
    private let anonKey: String

    // Keychain keys
    private static let keychainService = "com.rellay.app.auth"
    private static let accessTokenKey  = "access_token"
    private static let refreshTokenKey = "refresh_token"

    // Apple Sign-In continuations
    private var appleSignInContinuation: CheckedContinuation<Void, Error>?

    override init() {
        self.baseURL = URL(string: Config.supabaseURL) ?? URL(string: "https://placeholder.supabase.co")!
        self.anonKey = Config.supabaseAnonKey
        super.init()
        Task { await restoreSession() }
    }

    // MARK: - Session Restore

    func restoreSession() async {
        isLoading = true
        defer { isLoading = false }
        if keychainRead(key: Self.accessTokenKey) != nil {
            await fetchProfile()
            isAuthenticated = currentUser != nil
        } else {
            isAuthenticated = false
        }
    }

    // MARK: - Sign In (Email + Password)

    /// Native iOS does NOT need the /api/auth/sign-in proxy.
    /// Call Supabase directly from Swift — no WebView encoding issues.
    func signIn(email: String, password: String) async throws {
        let normalizedEmail = email.trimmingCharacters(in: .whitespaces).lowercased()
        let normalizedPassword = password.trimmingCharacters(in: .whitespaces)

        guard !normalizedEmail.isEmpty, !normalizedPassword.isEmpty else {
            throw AuthError.emptyFields
        }

        let url = baseURL
            .appendingPathComponent("auth/v1/token")
            .appendingQueryItem("grant_type", value: "password")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        let body = ["email": normalizedEmail, "password": normalizedPassword]
        req.httpBody = try JSONEncoder().encode(body)

        let (data, res) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]

        if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let msg = json["error_description"] as? String
                ?? json["msg"] as? String
                ?? "Invalid email or password."
            if msg.contains("Invalid login credentials") || http.statusCode == 400 {
                throw AuthError.invalidCredentials
            }
            throw AuthError.custom(msg)
        }

        guard let accessToken = json["access_token"] as? String else {
            throw AuthError.invalidCredentials
        }
        keychainWrite(key: Self.accessTokenKey, value: accessToken)
        if let refreshToken = json["refresh_token"] as? String {
            keychainWrite(key: Self.refreshTokenKey, value: refreshToken)
        }
        await fetchProfile()
        isAuthenticated = true
    }

    // MARK: - Sign Up (Email + Password)

    /// Returns true if the user was signed in immediately (email confirmation disabled),
    /// or false if email confirmation is required (show "check your email" message).
    @discardableResult
    func signUp(email: String, password: String, displayName: String, username: String) async throws -> Bool {
        let trimmedEmail    = email.trimmingCharacters(in: .whitespaces).lowercased()
        let trimmedPassword = password.trimmingCharacters(in: .whitespaces)
        let trimmedName     = String(displayName.trimmingCharacters(in: .whitespaces).prefix(100))
        let trimmedUsername = username.trimmingCharacters(in: .whitespaces)

        let url = baseURL.appendingPathComponent("auth/v1/signup")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        let body: [String: Any] = [
            "email": trimmedEmail,
            "password": trimmedPassword,
            "data": [
                "full_name": trimmedName,
                "username": trimmedUsername
            ],
            "gotrue_meta_security": [:]
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, res) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]

        if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let msg = json["msg"] as? String
                ?? json["error_description"] as? String
                ?? "Sign up failed."
            throw AuthError.custom(msg)
        }

        // If a session is present, email confirmation is disabled — sign the user in
        if let accessToken = json["access_token"] as? String {
            keychainWrite(key: Self.accessTokenKey, value: accessToken)
            if let refreshToken = json["refresh_token"] as? String {
                keychainWrite(key: Self.refreshTokenKey, value: refreshToken)
            }
            // Update profile display_name explicitly (trigger seeds from full_name,
            // but we want to guarantee the correct value wins)
            if let userId = (json["user"] as? [String: Any])?["id"] as? String {
                await updateProfileDisplayName(userId: userId, displayName: trimmedName)
            }
            await fetchProfile()
            isAuthenticated = true
            return true
        }

        // No session — email confirmation required
        return false
    }

    // MARK: - Sign Out

    func signOut() async {
        // Revoke the token on the Supabase server
        if let token = keychainRead(key: Self.accessTokenKey) {
            var req = URLRequest(url: baseURL.appendingPathComponent("auth/v1/logout"))
            req.httpMethod = "POST"
            req.setValue(anonKey, forHTTPHeaderField: "apikey")
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            _ = try? await URLSession.shared.data(for: req)
        }
        keychainDelete(key: Self.accessTokenKey)
        keychainDelete(key: Self.refreshTokenKey)
        currentUser = nil
        isAuthenticated = false
    }

    // MARK: - Forgot Password

    /// Sends a password-reset email. Always succeeds (prevents enumeration).
    func forgotPassword(email: String) async throws {
        let normalizedEmail = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard !normalizedEmail.isEmpty else {
            throw AuthError.emptyFields
        }
        let redirectTo = "com.rellay.app://reset-password"
        var comps = URLComponents(url: baseURL.appendingPathComponent("auth/v1/recover"),
                                  resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "redirect_to", value: redirectTo)]
        guard let url = comps.url else { throw AuthError.custom("Invalid URL") }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try JSONEncoder().encode(["email": normalizedEmail])
        let (_, res) = try await URLSession.shared.data(for: req)
        // Supabase always returns 200 for this endpoint (enumeration protection)
        if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw AuthError.custom("Could not start password reset. Try again in a moment.")
        }
    }

    // MARK: - Set Recovery Session (from deep link)

    /// Called by the app's onOpenURL handler when a recovery deep link arrives.
    /// Stores the recovery access token so resetPassword() can use it.
    func setRecoverySession(accessToken: String, refreshToken: String?) {
        keychainWrite(key: Self.accessTokenKey, value: accessToken)
        if let rt = refreshToken {
            keychainWrite(key: Self.refreshTokenKey, value: rt)
        }
    }

    // MARK: - Reset Password

    /// Updates the authenticated user's password. Requires a recovery session
    /// established via setRecoverySession(accessToken:refreshToken:).
    func resetPassword(newPassword: String) async throws {
        guard let token = keychainRead(key: Self.accessTokenKey) else {
            throw AuthError.noSession
        }
        let url = baseURL.appendingPathComponent("auth/v1/user")
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(["password": newPassword])
        let (data, res) = try await URLSession.shared.data(for: req)
        if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
            let msg = json["msg"] as? String ?? "Could not update password."
            throw AuthError.custom(msg)
        }
    }

    // MARK: - Update Display Name (Username Setup screen)

    func updateDisplayName(_ displayName: String) async throws {
        guard let userId = currentUser?.id else { throw AuthError.noSession }
        try await updateProfileDisplayName(userId: userId, displayName: displayName)
        // Refresh local cache
        await fetchProfile()
    }

    // MARK: - Fetch Profile

    func fetchProfile() async {
        guard let token = keychainRead(key: Self.accessTokenKey) else { return }

        // 1. Get user id from auth endpoint
        var userReq = URLRequest(url: baseURL.appendingPathComponent("auth/v1/user"))
        userReq.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        userReq.setValue(anonKey, forHTTPHeaderField: "apikey")
        guard let (userData, userRes) = try? await URLSession.shared.data(for: userReq),
              let http = userRes as? HTTPURLResponse, http.statusCode == 200,
              let userJson = try? JSONSerialization.jsonObject(with: userData) as? [String: Any],
              let userId = userJson["id"] as? String else {
            currentUser = nil
            return
        }

        // 2. Fetch profile row
        var comps = URLComponents(url: baseURL.appendingPathComponent("rest/v1/profiles"),
                                  resolvingAgainstBaseURL: false)!
        comps.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(userId)"),
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "limit", value: "1")
        ]
        guard let profileURL = comps.url else { currentUser = nil; return }
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

    // MARK: - Apple Sign-In

    func signInWithApple() async throws {
        let provider = ASAuthorizationAppleIDProvider()
        let request  = provider.createRequest()
        request.requestedScopes = [.fullName, .email]
        let nonce = randomNonce()
        request.nonce = sha256(nonce)

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self

        // Use async/await bridge
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
            appleSignInContinuation = cont
            appleNonce = nonce
            controller.performRequests()
        }
    }

    // Nonce storage for Apple Sign-In (set before controller.performRequests())
    private var appleNonce: String = ""

    // MARK: - Auth Header (for APIClient)

    var authHeader: [String: String] {
        guard let token = keychainRead(key: Self.accessTokenKey) else {
            return ["apikey": anonKey]
        }
        return [
            "apikey": anonKey,
            "Authorization": "Bearer \(token)"
        ]
    }

    // MARK: - Private Helpers

    private func updateProfileDisplayName(userId: String, displayName: String) async {
        guard let token = keychainRead(key: Self.accessTokenKey) else { return }
        var comps = URLComponents(url: baseURL.appendingPathComponent("rest/v1/profiles"),
                                  resolvingAgainstBaseURL: false)!
        comps.queryItems = [URLQueryItem(name: "id", value: "eq.\(userId)")]
        guard let url = comps.url else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try? JSONEncoder().encode(["display_name": displayName])
        _ = try? await URLSession.shared.data(for: req)
    }

    private func exchangeIdTokenWithSupabase(provider: String, idToken: String, nonce: String) async throws {
        let url = baseURL
            .appendingPathComponent("auth/v1/token")
            .appendingQueryItem("grant_type", value: "id_token")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        let body: [String: Any] = [
            "provider": provider,
            "id_token": idToken,
            "nonce": nonce
        ]
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, res) = try await URLSession.shared.data(for: req)
        let json = (try? JSONSerialization.jsonObject(with: data) as? [String: Any]) ?? [:]
        if let http = res as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            let msg = json["msg"] as? String ?? "Sign in with \(provider) failed."
            throw AuthError.custom(msg)
        }
        guard let accessToken = json["access_token"] as? String else {
            throw AuthError.custom("No session returned from \(provider) sign-in.")
        }
        keychainWrite(key: Self.accessTokenKey, value: accessToken)
        if let refreshToken = json["refresh_token"] as? String {
            keychainWrite(key: Self.refreshTokenKey, value: refreshToken)
        }
        await fetchProfile()
        isAuthenticated = true
    }

    // MARK: - Keychain

    private func keychainWrite(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: Self.keychainService,
            kSecAttrAccount: key
        ]
        let attrs: [CFString: Any] = [kSecValueData: data]
        if SecItemUpdate(query as CFDictionary, attrs as CFDictionary) == errSecItemNotFound {
            var addQuery = query
            addQuery[kSecValueData] = data
            SecItemAdd(addQuery as CFDictionary, nil)
        }
    }

    func keychainRead(key: String) -> String? {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: Self.keychainService,
            kSecAttrAccount: key,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        var result: AnyObject?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let str = String(data: data, encoding: .utf8) else { return nil }
        return str
    }

    private func keychainDelete(key: String) {
        let query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: Self.keychainService,
            kSecAttrAccount: key
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Crypto helpers (Apple Sign-In nonce)

    private func randomNonce(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            let randoms = (0..<16).map { _ in UInt8.random(in: 0...255) }
            randoms.forEach { random in
                if remaining == 0 { return }
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remaining -= 1
                }
            }
        }
        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let digest = SHA256.hash(data: data)
        return digest.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - Apple Sign-In Delegate

extension AuthService: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? UIWindow()
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityTokenData = credential.identityToken,
              let identityToken = String(data: identityTokenData, encoding: .utf8) else {
            appleSignInContinuation?.resume(throwing: AuthError.custom("Apple Sign-In failed: no identity token"))
            appleSignInContinuation = nil
            return
        }
        let nonce = appleNonce
        Task {
            do {
                try await exchangeIdTokenWithSupabase(provider: "apple",
                                                      idToken: identityToken,
                                                      nonce: nonce)
                appleSignInContinuation?.resume()
            } catch {
                appleSignInContinuation?.resume(throwing: error)
            }
            appleSignInContinuation = nil
        }
    }

    func authorizationController(controller: ASAuthorizationController,
                                 didCompleteWithError error: Error) {
        appleSignInContinuation?.resume(throwing: error)
        appleSignInContinuation = nil
    }
}

// MARK: - Error Types

enum AuthError: LocalizedError {
    case emptyFields
    case invalidCredentials
    case noSession
    case signUpFailed
    case custom(String)

    var errorDescription: String? {
        switch self {
        case .emptyFields:
            return "Enter email and password."
        case .invalidCredentials:
            return "Invalid email or password. Check for typos or use 'Forgot password?' to reset."
        case .noSession:
            return "No active session. Please log in again."
        case .signUpFailed:
            return "Sign up failed. Please try again."
        case .custom(let msg):
            return msg
        }
    }
}

// MARK: - URL helper

extension URL {
    func appendingQueryItem(_ name: String, value: String) -> URL {
        var c = URLComponents(url: self, resolvingAgainstBaseURL: false)!
        c.queryItems = (c.queryItems ?? []) + [URLQueryItem(name: name, value: value)]
        return c.url ?? self
    }
}
