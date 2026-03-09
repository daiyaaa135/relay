//
//  UsernameSetupView.swift
//  Rellaey IOS
//
//  Spec: /signup/username (app/signup/username/page.tsx)
//
//  Post-OAuth or explicit step where the user sets/confirms their display name.
//  Auth-gated: redirects to login if no session exists.
//

import SwiftUI

struct UsernameSetupView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var usernameInput = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    // Regex: letters, numbers, . _ - (matches spec)
    private let allowedRegex = /^[A-Za-z0-9_.\-]+$/

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Icon
                    ZStack {
                        Circle()
                            .fill(Color.relayPrimary.opacity(0.1))
                            .frame(width: 72, height: 72)
                        Image(systemName: "person.badge.plus")
                            .font(.system(size: 28, weight: .medium))
                            .foregroundColor(.relayPrimary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.bottom, 24)

                    Text("Choose a username")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(.relayText)
                        .padding(.bottom, 8)

                    Text("This is how other Relay members will find and recognise you.")
                        .font(.system(size: 14))
                        .foregroundColor(.relayMuted)
                        .padding(.bottom, 28)

                    // Error banner
                    if let msg = errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 14))
                            Text(msg)
                                .font(.system(size: 13))
                                .foregroundColor(Color(red: 0.7, green: 0.1, blue: 0.1))
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .padding(.bottom, 16)
                    }

                    // @ prefix + field
                    HStack(spacing: 0) {
                        Text("@")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.relayMuted)
                            .padding(.leading, 16)
                            .padding(.trailing, 4)
                        TextField("username", text: $usernameInput)
                            .font(.system(size: 15, weight: .medium))
                            .autocapitalization(.none)
                            .autocorrectionDisabled()
                            .textContentType(.username)
                            .frame(height: 52)
                    }
                    .background(Color.relayInput.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .padding(.bottom, 8)

                    Text("6–30 characters. Letters, numbers, . _ - allowed.")
                        .font(.system(size: 11))
                        .foregroundColor(.relayMuted)
                        .padding(.bottom, 24)

                    RelayPrimaryButton(
                        title: "Save username",
                        isLoading: isLoading,
                        isDisabled: usernameInput.trimmingCharacters(in: .whitespaces).isEmpty
                    ) {
                        save()
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Set Username")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { prefillUsername() }
    }

    // MARK: - Pre-fill

    private func prefillUsername() {
        if let existing = auth.currentUser?.displayName, !existing.isEmpty {
            usernameInput = String(existing.prefix(30))
        }
    }

    // MARK: - Validation

    private func validate(_ input: String) -> String? {
        let trimmed = input.trimmingCharacters(in: .whitespaces)
        if trimmed.count < 6 || trimmed.count > 30 {
            return "Username must be 6–30 characters (letters, numbers, . _ -)."
        }
        if (try? allowedRegex.wholeMatch(in: trimmed)) == nil {
            return "Username must be 6–30 characters (letters, numbers, . _ -)."
        }
        return nil
    }

    // MARK: - Action

    private func save() {
        errorMessage = nil
        let trimmed = usernameInput.trimmingCharacters(in: .whitespaces)
        if let err = validate(trimmed) {
            errorMessage = err
            return
        }
        isLoading = true
        Task {
            do {
                try await auth.updateDisplayName(trimmed)
                Haptics.success()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                Haptics.error()
            }
            await MainActor.run { isLoading = false }
        }
    }
}
