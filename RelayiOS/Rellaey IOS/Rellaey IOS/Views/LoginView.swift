//
//  LoginView.swift
//  Rellaey IOS
//
//  Covers /login and /signup screens.
//  Spec: app/login/page.tsx + app/signup/page.tsx
//

import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var email = ""
    @State private var password = ""
    // Signup-only fields
    @State private var displayName = ""
    @State private var username = ""
    // Per-field validation errors (signup)
    @State private var displayNameError: String?
    @State private var usernameError: String?
    // General error / success messages
    @State private var errorMessage: String?
    @State private var successMessage: String?

    @State private var isSignUp = false
    @State private var isLoading = false

    @State private var showForgotPassword = false

    // Hero floating animation offsets
    @State private var float1: CGFloat = 0
    @State private var float2: CGFloat = 0

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                // ── Background ──
                Color.relayBackground.ignoresSafeArea()

                // Decorative rings
                ZStack {
                    Circle()
                        .stroke(Color.relayPrimary.opacity(0.07), lineWidth: 1)
                        .frame(width: 300, height: 300)
                    Circle()
                        .stroke(Color.relayPrimary.opacity(0.04), lineWidth: 1)
                        .frame(width: 460, height: 460)
                }
                .offset(y: -140)

                // Floating gadget icons
                VStack {
                    ZStack {
                        HeroIcon(systemImage: "iphone.gen3", size: 72, color: .relayPrimary, offset: float1)
                            .offset(x: -80, y: 10)
                        HeroIcon(systemImage: "laptopcomputer", size: 58, color: Color(red: 0.2, green: 0.2, blue: 0.9).opacity(0.8), offset: float2)
                            .offset(x: 70, y: -5)
                    }
                    .frame(height: 180)
                    .padding(.top, 70)
                    Spacer()
                }

                // ── Auth card ──
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // Handle
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.relayMuted.opacity(0.3))
                            .frame(width: 36, height: 4)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 12)
                            .padding(.bottom, 24)

                        // Title
                        Text(isSignUp ? "Create account" : "Log in")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.relayText)
                            .padding(.bottom, 6)

                        Text(isSignUp ? "Join the tech rotation community." : "Welcome back to Relay.")
                            .font(.system(size: 14))
                            .foregroundColor(.relayMuted)
                            .padding(.bottom, 24)

                        // ── Error / Success banners ──
                        if let msg = errorMessage {
                            InlineBanner(message: msg, isError: true)
                                .padding(.bottom, 16)
                        }
                        if let msg = successMessage {
                            InlineBanner(message: msg, isError: false)
                                .padding(.bottom, 16)
                        }

                        // ── Fields ──
                        VStack(spacing: 10) {
                            if isSignUp {
                                VStack(alignment: .leading, spacing: 4) {
                                    RelayInputField(
                                        systemImage: "person",
                                        placeholder: "Display name (3–20 chars)",
                                        text: $displayName
                                    )
                                    .textContentType(.name)
                                    .onChange(of: displayName) { _ in displayNameError = nil }

                                    if let err = displayNameError {
                                        Text(err)
                                            .font(.system(size: 12))
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 4)
                                    }
                                }

                                VStack(alignment: .leading, spacing: 4) {
                                    RelayInputField(
                                        systemImage: "at",
                                        placeholder: "Username (6–20 chars)",
                                        text: $username
                                    )
                                    .textContentType(.username)
                                    .onChange(of: username) { _ in usernameError = nil }

                                    if let err = usernameError {
                                        Text(err)
                                            .font(.system(size: 12))
                                            .foregroundColor(.red)
                                            .padding(.horizontal, 4)
                                    }
                                }
                            }

                            RelayInputField(
                                systemImage: "envelope",
                                placeholder: "Email address",
                                text: $email
                            )
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)

                            RelayInputField(
                                systemImage: "lock",
                                placeholder: isSignUp ? "Password (min 6 chars)" : "Password",
                                text: $password,
                                isSecure: true
                            )
                            .textContentType(isSignUp ? .newPassword : .password)
                        }
                        .padding(.bottom, 12)

                        // Forgot password (sign-in only)
                        if !isSignUp {
                            Button {
                                showForgotPassword = true
                            } label: {
                                Text("Forgot password?")
                                    .font(.system(size: 12))
                                    .foregroundColor(.relayMuted)
                                    .underline()
                            }
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.bottom, 20)
                        }

                        // ── Primary submit ──
                        RelayPrimaryButton(
                            title: isSignUp ? "Create account" : "Log in",
                            isLoading: isLoading,
                            isDisabled: submitDisabled
                        ) {
                            submit()
                        }
                        .padding(.bottom, 16)

                        // ── Divider ──
                        HStack {
                            Rectangle().fill(Color.relayMuted.opacity(0.2)).frame(height: 1)
                            Text("or")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.relayMuted)
                                .padding(.horizontal, 12)
                            Rectangle().fill(Color.relayMuted.opacity(0.2)).frame(height: 1)
                        }
                        .padding(.bottom, 12)

                        // ── Apple Sign-In ──
                        // Required by App Store Guidelines §4.8 when any social sign-in is shown.
                        SignInWithAppleButton(.signIn) { request in
                            request.requestedScopes = [.fullName, .email]
                        } onCompletion: { _ in
                            // Handled via AuthService delegate
                        }
                        .signInWithAppleButtonStyle(.black)
                        .frame(height: 50)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .onTapGesture { handleAppleSignIn() }
                        .padding(.bottom, 8)

                        // ── Toggle sign-in / sign-up ──
                        HStack(spacing: 4) {
                            Text(isSignUp ? "Already have an account?" : "New to tech rotation?")
                                .font(.system(size: 13))
                                .foregroundColor(.relayMuted)
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    isSignUp.toggle()
                                    clearErrors()
                                }
                            } label: {
                                Text(isSignUp ? "Log in" : "Join Relay")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundColor(.relayPrimary)
                                    .underline()
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .padding(.bottom, 16)

                        // ── Legal links ──
                        HStack(spacing: 4) {
                            Text("By continuing you agree to our")
                                .font(.system(size: 11))
                                .foregroundColor(.relayMuted.opacity(0.7))
                            NavigationLink("Terms of Service") {
                                PlaceholderSettingsPage(title: "Terms of Service")
                            }
                            .font(.system(size: 11))
                            .foregroundColor(.relayMuted)
                            Text("and")
                                .font(.system(size: 11))
                                .foregroundColor(.relayMuted.opacity(0.7))
                            NavigationLink("Privacy Policy") {
                                PlaceholderSettingsPage(title: "Privacy Policy")
                            }
                            .font(.system(size: 11))
                            .foregroundColor(.relayMuted)
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)
                }
                .background(
                    Color.relaySurface
                        .clipShape(
                            .rect(
                                topLeadingRadius: 28,
                                bottomLeadingRadius: 0,
                                bottomTrailingRadius: 0,
                                topTrailingRadius: 28
                            )
                        )
                        .shadow(color: .black.opacity(0.08), radius: 20, x: 0, y: -4)
                )
            }
            .ignoresSafeArea(edges: .bottom)
            .onAppear {
                withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { float1 = -10 }
                withAnimation(.easeInOut(duration: 3.8).repeatForever(autoreverses: true).delay(1)) { float2 = -8 }
            }
            .navigationDestination(isPresented: $showForgotPassword) {
                ForgotPasswordView()
            }
        }
    }

    // MARK: - Validation

    private var submitDisabled: Bool {
        if isSignUp {
            return email.trimmingCharacters(in: .whitespaces).isEmpty
                || password.trimmingCharacters(in: .whitespaces).isEmpty
                || displayName.trimmingCharacters(in: .whitespaces).isEmpty
                || username.trimmingCharacters(in: .whitespaces).isEmpty
        }
        return email.trimmingCharacters(in: .whitespaces).isEmpty
            || password.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func validateSignUp() -> Bool {
        let trimmedName = displayName.trimmingCharacters(in: .whitespaces)
        let trimmedUser = username.trimmingCharacters(in: .whitespaces)
        var valid = true

        if trimmedName.count < 3 || trimmedName.count > 20 {
            displayNameError = "Display name must be 3–20 characters."
            valid = false
        }
        if trimmedUser.count < 6 || trimmedUser.count > 20 {
            usernameError = "Username must be 6–20 characters."
            valid = false
        }
        return valid
    }

    // MARK: - Actions

    private func submit() {
        clearErrors()
        if isSignUp && !validateSignUp() { return }

        let trimmedEmail    = email.trimmingCharacters(in: .whitespaces).lowercased()
        let trimmedPassword = password.trimmingCharacters(in: .whitespaces)

        guard !trimmedEmail.isEmpty, !trimmedPassword.isEmpty else {
            errorMessage = "Enter email and password."
            return
        }
        if isSignUp && trimmedPassword.count < 6 {
            errorMessage = "Password must be at least 6 characters."
            return
        }

        isLoading = true
        Task {
            do {
                if isSignUp {
                    let sessionCreated = try await auth.signUp(
                        email: trimmedEmail,
                        password: trimmedPassword,
                        displayName: displayName.trimmingCharacters(in: .whitespaces),
                        username: username.trimmingCharacters(in: .whitespaces)
                    )
                    if !sessionCreated {
                        successMessage = "Account created! Check your email to confirm, then log in."
                    }
                    // If sessionCreated == true, AuthService sets isAuthenticated and RootView navigates automatically.
                } else {
                    try await auth.signIn(email: trimmedEmail, password: trimmedPassword)
                }
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func handleAppleSignIn() {
        isLoading = true
        Task {
            do {
                try await auth.signInWithApple()
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            await MainActor.run { isLoading = false }
        }
    }

    private func clearErrors() {
        errorMessage = nil
        successMessage = nil
        displayNameError = nil
        usernameError = nil
    }
}

// MARK: - Inline Banner

private struct InlineBanner: View {
    let message: String
    let isError: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isError ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
                .foregroundColor(isError ? .red : Color(red: 0.1, green: 0.6, blue: 0.3))
                .font(.system(size: 14))
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(isError ? Color(red: 0.7, green: 0.1, blue: 0.1) : Color(red: 0.1, green: 0.5, blue: 0.25))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background((isError ? Color.red : Color.green).opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Hero icon

private struct HeroIcon: View {
    let systemImage: String
    let size: CGFloat
    let color: Color
    let offset: CGFloat
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28)
                .fill(color.opacity(0.1))
                .frame(width: size + 16, height: size + 16)
            Image(systemName: systemImage)
                .font(.system(size: size * 0.52, weight: .light))
                .foregroundColor(color)
        }
        .offset(y: offset)
        .shadow(color: color.opacity(0.12), radius: 10, x: 0, y: 5)
    }
}
