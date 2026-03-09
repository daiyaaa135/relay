//
//  ResetPasswordView.swift
//  Rellaey IOS
//
//  Spec: /reset-password (app/reset-password/page.tsx)
//
//  Shown after the user taps the password-reset email link. The deep link
//  (com.rellay.app://reset-password#access_token=...&type=recovery) is
//  parsed by Rellaey_IOSApp.onOpenURL, which calls
//  AuthService.setRecoverySession(accessToken:refreshToken:) and then
//  sets the app's pendingRecoveryToken, which triggers this view.
//

import SwiftUI

struct ResetPasswordView: View {
    @EnvironmentObject var auth: AuthService
    // Bound to RootView's pendingRecoveryToken — set to nil on dismiss
    @Binding var isPresented: Bool

    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var didSucceed = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        // Icon
                        ZStack {
                            Circle()
                                .fill(Color.relayPrimary.opacity(0.1))
                                .frame(width: 72, height: 72)
                            Image(systemName: "lock.open.fill")
                                .font(.system(size: 28, weight: .medium))
                                .foregroundColor(.relayPrimary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.bottom, 24)

                        Text("Set new password")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.relayText)
                            .padding(.bottom, 8)

                        Text("Choose a new password for your account. Minimum 6 characters.")
                            .font(.system(size: 14))
                            .foregroundColor(.relayMuted)
                            .padding(.bottom, 28)

                        // Error / Success banner
                        if let msg = errorMessage {
                            BannerView(message: msg, isError: true)
                                .padding(.bottom, 16)
                        }
                        if didSucceed {
                            BannerView(
                                message: "Password updated. You can log in with your new password.",
                                isError: false
                            )
                            .padding(.bottom, 16)
                        }

                        // Fields
                        VStack(spacing: 10) {
                            RelayInputField(
                                systemImage: "lock",
                                placeholder: "New password",
                                text: $newPassword,
                                isSecure: true
                            )
                            .textContentType(.newPassword)
                            .disabled(didSucceed)

                            RelayInputField(
                                systemImage: "lock.fill",
                                placeholder: "Confirm new password",
                                text: $confirmPassword,
                                isSecure: true
                            )
                            .textContentType(.newPassword)
                            .disabled(didSucceed)
                        }
                        .padding(.bottom, 20)

                        // Button — state machine matches spec
                        RelayPrimaryButton(
                            title: buttonTitle,
                            isLoading: isLoading,
                            isDisabled: didSucceed || newPassword.isEmpty || confirmPassword.isEmpty
                        ) {
                            submit()
                        }
                        .padding(.bottom, 20)

                        // "Back to log in" text button
                        Button {
                            isPresented = false
                        } label: {
                            Text("Back to log in")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.relayMuted)
                                .underline()
                        }
                        .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 24)
                    .padding(.bottom, 32)
                }
            }
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        isPresented = false
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.relayMuted)
                    }
                }
            }
        }
    }

    // MARK: - Button state (matches spec table)
    private var buttonTitle: String {
        if isLoading  { return "Saving…" }
        if didSucceed { return "Password saved" }
        return "Save new password"
    }

    // MARK: - Action

    private func submit() {
        errorMessage = nil
        let trimmedNew     = newPassword.trimmingCharacters(in: .whitespaces)
        let trimmedConfirm = confirmPassword.trimmingCharacters(in: .whitespaces)

        guard !trimmedNew.isEmpty, !trimmedConfirm.isEmpty else {
            errorMessage = "Enter and confirm your new password."
            return
        }
        guard trimmedNew == trimmedConfirm else {
            errorMessage = "Passwords do not match."
            return
        }
        guard trimmedNew.count >= 6 else {
            errorMessage = "Password must be at least 6 characters."
            return
        }

        isLoading = true
        Task {
            do {
                try await auth.resetPassword(newPassword: trimmedNew)
                didSucceed = true
                Haptics.success()
                // Spec: auto-navigate to login after 1500ms
                try? await Task.sleep(nanoseconds: 1_500_000_000)
                await MainActor.run { isPresented = false }
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
