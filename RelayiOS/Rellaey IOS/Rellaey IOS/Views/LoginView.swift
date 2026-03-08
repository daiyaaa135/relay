//
//  LoginView.swift
//  Rellaey IOS
//
//  Auth screen matching the Next.js /login design
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var isSignUp = false
    @State private var errorMessage: String?
    @State private var isLoading = false

    // Floating animation offsets
    @State private var float1: CGFloat = 0
    @State private var float2: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Hero background ──
            Color.relayBackground.ignoresSafeArea()

            // Decorative circles
            ZStack {
                Circle()
                    .stroke(Color.relayPrimary.opacity(0.07), lineWidth: 1)
                    .frame(width: 300, height: 300)
                Circle()
                    .stroke(Color.relayPrimary.opacity(0.04), lineWidth: 1)
                    .frame(width: 460, height: 460)
            }
            .offset(y: -140)

            // Floating icons
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

                // Error message
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

                // Fields
                VStack(spacing: 10) {
                    if isSignUp {
                        RelayInputField(
                            systemImage: "person",
                            placeholder: "Display name",
                            text: $displayName
                        )
                        .textContentType(.username)
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
                        placeholder: "Password",
                        text: $password,
                        isSecure: true
                    )
                    .textContentType(isSignUp ? .newPassword : .password)
                }
                .padding(.bottom, 12)

                // Forgot password (sign-in only)
                if !isSignUp {
                    Button {} label: {
                        Text("Forgot password?")
                            .font(.system(size: 12))
                            .foregroundColor(.relayMuted)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.bottom, 20)
                }

                // Submit
                RelayPrimaryButton(
                    title: isSignUp ? "Create account" : "Log in",
                    isLoading: isLoading,
                    isDisabled: email.isEmpty || password.isEmpty || (isSignUp && displayName.isEmpty)
                ) {
                    submit()
                }
                .padding(.bottom, 16)

                // Toggle sign-in / sign-up
                HStack(spacing: 4) {
                    Text(isSignUp ? "Already have an account?" : "New to tech rotation?")
                        .font(.system(size: 13))
                        .foregroundColor(.relayMuted)
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            isSignUp.toggle()
                            errorMessage = nil
                        }
                    } label: {
                        Text(isSignUp ? "Log in" : "Join Relay")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(.relayPrimary)
                            .underline()
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.bottom, 8)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
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
    }

    private func submit() {
        errorMessage = nil
        isLoading = true
        Task {
            do {
                if isSignUp {
                    try await auth.signUp(email: email, password: password, displayName: displayName)
                } else {
                    try await auth.signIn(email: email, password: password)
                }
            } catch {
                errorMessage = error.localizedDescription
            }
            await MainActor.run { isLoading = false }
        }
    }
}

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
