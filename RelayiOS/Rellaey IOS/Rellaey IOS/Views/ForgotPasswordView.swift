//
//  ForgotPasswordView.swift
//  Rellaey IOS
//
//  Spec: /forgot-password (app/forgot-password/page.tsx)
//
//  Lets the user request a password-reset email. Always shows a success-shaped
//  message on submit (prevents account enumeration).
//

import SwiftUI

struct ForgotPasswordView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // Icon
                        ZStack {
                            Circle()
                                .fill(Color.relayPrimary.opacity(0.1))
                                .frame(width: 72, height: 72)
                            Image(systemName: "lock.rotation")
                                .font(.system(size: 30, weight: .medium))
                                .foregroundColor(.relayPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.bottom, 24)

                        Text("Forgot password?")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.relayText)
                            .padding(.bottom, 8)

                        Text("Enter the email you use for Relay. We'll send a link to reset your password.")
                            .font(.system(size: 14))
                            .foregroundColor(.relayMuted)
                            .padding(.bottom, 28)

                        // Error / Success banners
                        if let msg = errorMessage {
                            BannerView(message: msg, isError: true)
                                .padding(.bottom, 16)
                        }
                        if let msg = successMessage {
                            BannerView(message: msg, isError: false)
                                .padding(.bottom, 16)
                        }

                        // Email field
                        RelayInputField(
                            systemImage: "envelope",
                            placeholder: "Email address",
                            text: $email
                        )
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .disabled(successMessage != nil) // lock after success
                        .padding(.bottom, 20)

                        RelayPrimaryButton(
                            title: "Send reset link",
                            isLoading: isLoading,
                            isDisabled: email.trimmingCharacters(in: .whitespaces).isEmpty || successMessage != nil
                        ) {
                            submit()
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 32)
                }
            }
        }
        .navigationTitle("Reset Password")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Action

    private func submit() {
        errorMessage = nil
        let trimmed = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard !trimmed.isEmpty else {
            errorMessage = "Enter the email you use for Relay."
            return
        }
        isLoading = true
        Task {
            do {
                try await auth.forgotPassword(email: trimmed)
                // Deliberate ambiguity — prevents account enumeration
                successMessage = "If an account exists for that email, we've sent a link to reset your password."
                Haptics.success()
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            await MainActor.run { isLoading = false }
        }
    }
}

// MARK: - Banner

private struct BannerView: View {
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
