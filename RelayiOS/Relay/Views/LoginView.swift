//
//  LoginView.swift
//  Relay
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthService
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var isSignUp = false
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    Text("Relay")
                        .font(.largeTitle.bold())
                        .foregroundColor(Color(red: 1, green: 0.34, blue: 0.13))
                        .padding(.top, 48)

                    if isSignUp {
                        TextField("Display name", text: $displayName)
                            .textContentType(.username)
                            .autocapitalization(.words)
                            .textFieldStyle(.roundedBorder)
                            .padding(.horizontal)
                    }

                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    SecureField("Password", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                        .textFieldStyle(.roundedBorder)
                        .padding(.horizontal)

                    if let msg = errorMessage {
                        Text(msg)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }

                    Button {
                        submit()
                    } label: {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        } else {
                            Text(isSignUp ? "Sign Up" : "Sign In")
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 1, green: 0.34, blue: 0.13))
                    .disabled(isLoading || email.isEmpty || password.isEmpty || (isSignUp && displayName.isEmpty))
                    .padding(.horizontal)
                    .padding(.top, 8)

                    Button(isSignUp ? "Already have an account? Sign In" : "Create account") {
                        isSignUp.toggle()
                        errorMessage = nil
                    }
                    .font(.subheadline)
                    .padding(.top, 8)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
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
