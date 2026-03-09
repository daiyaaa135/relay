//
//  SettingsView.swift
//  Rellaey IOS
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var auth: AuthService
    @AppStorage("relayDarkMode") private var darkMode = false
    @AppStorage("relayNotificationsEnabled") private var notificationsEnabled = true
    @State private var showSignOutAlert = false

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    // Account section
                    SettingsSection(title: "Account") {
                        NavigationLink {
                            EditProfileView()
                        } label: {
                            SettingsRow(icon: "person.circle", label: "Edit Profile")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Change Email")
                        } label: {
                            SettingsRow(icon: "envelope", label: "Email")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        // Reset password — spec: Settings navigates to /forgot-password?from=settings
                        NavigationLink {
                            ForgotPasswordView()
                        } label: {
                            SettingsRow(icon: "key.horizontal", label: "Reset Password")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Change Phone")
                        } label: {
                            SettingsRow(icon: "phone", label: "Phone Number")
                        }
                        .buttonStyle(.plain)
                    }

                    // App section
                    SettingsSection(title: "App") {
                        HStack {
                            Image(systemName: "moon.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.relayPrimary)
                                .frame(width: 28)
                            Text("Dark Mode")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.relayText)
                            Spacer()
                            Toggle("", isOn: $darkMode)
                                .labelsHidden()
                                .tint(.relayPrimary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        Divider().padding(.leading, 52)
                        HStack {
                            Image(systemName: "bell.fill")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.relayPrimary)
                                .frame(width: 28)
                            Text("Push Notifications")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundColor(.relayText)
                            Spacer()
                            Toggle("", isOn: $notificationsEnabled)
                                .labelsHidden()
                                .tint(.relayPrimary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                    }

                    // Safety section
                    SettingsSection(title: "Safety & Privacy") {
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Blocked Users")
                        } label: {
                            SettingsRow(icon: "person.slash", label: "Blocked Users")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "My Reports")
                        } label: {
                            SettingsRow(icon: "flag", label: "My Reports")
                        }
                        .buttonStyle(.plain)
                    }

                    // Legal section
                    SettingsSection(title: "Legal & Support") {
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Help Center")
                        } label: {
                            SettingsRow(icon: "questionmark.circle", label: "Help Center")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Community Guidelines")
                        } label: {
                            SettingsRow(icon: "list.bullet.clipboard", label: "Community Guidelines")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Terms of Service")
                        } label: {
                            SettingsRow(icon: "doc.text", label: "Terms of Service")
                        }
                        .buttonStyle(.plain)
                        Divider().padding(.leading, 52)
                        NavigationLink {
                            PlaceholderSettingsPage(title: "Privacy Policy")
                        } label: {
                            SettingsRow(icon: "lock.shield", label: "Privacy Policy")
                        }
                        .buttonStyle(.plain)
                    }

                    // Danger zone
                    SettingsSection(title: "Account Actions") {
                        Button {
                            showSignOutAlert = true
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.red)
                                    .frame(width: 28)
                                Text("Sign Out")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.red)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                        }
                    }

                    // App version
                    if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String {
                        Text("Rellay v\(version)")
                            .font(.system(size: 12))
                            .foregroundColor(.relayMuted.opacity(0.6))
                            .padding(.bottom, 8)
                    }
                }
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.large)
        .alert("Sign Out", isPresented: $showSignOutAlert) {
            Button("Sign Out", role: .destructive) { auth.signOut() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }
}

// MARK: - Section
struct SettingsSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.relayMuted)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)

            VStack(spacing: 0) {
                content
            }
            .background(Color.relaySurface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - Row
struct SettingsRow: View {
    let icon: String
    let label: String
    var destructive = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(destructive ? .red : .relayPrimary)
                .frame(width: 28)
            Text(label)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(destructive ? .red : .relayText)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.relayMuted.opacity(0.5))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

// MARK: - Placeholder for unbuilt pages
struct PlaceholderSettingsPage: View {
    let title: String
    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()
            Text("Coming soon")
                .font(.system(size: 16))
                .foregroundColor(.relayMuted)
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.large)
    }
}
