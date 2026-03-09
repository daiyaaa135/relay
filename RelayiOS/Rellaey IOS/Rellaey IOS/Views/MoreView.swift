//
//  MoreView.swift
//  Rellaey IOS
//

import SwiftUI

struct MoreView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        // ── Profile card (tappable → ProfileView) ──
                        if let user = auth.currentUser {
                            NavigationLink {
                                ProfileView()
                            } label: {
                                ProfileCard(user: user)
                            }
                            .buttonStyle(.plain)
                        }

                        // ── Account section ──
                        MenuSection(title: "Account") {
                            MenuRow(icon: "list.bullet.rectangle", label: "My Listings") {
                                ProfileView()
                            }
                            Divider().padding(.leading, 52)
                            MenuRow(icon: "arrow.triangle.2.circlepath", label: "My Swaps") {
                                SwapsView()
                            }
                            Divider().padding(.leading, 52)
                            MenuRow(icon: "creditcard", label: "Wallet") {
                                WalletView()
                            }
                        }

                        // ── Preferences section ──
                        MenuSection(title: "Preferences") {
                            MenuRow(icon: "gearshape", label: "Settings") {
                                SettingsView()
                            }
                            Divider().padding(.leading, 52)
                            MenuRow(icon: "star.fill", label: "Relay+") {
                                PlaceholderSettingsPage(title: "Relay+")
                            }
                        }

                        // ── Support section ──
                        MenuSection(title: "Support") {
                            MenuRow(icon: "questionmark.circle", label: "Help Center") {
                                PlaceholderSettingsPage(title: "Help Center")
                            }
                            Divider().padding(.leading, 52)
                            MenuRow(icon: "shield.lefthalf.filled", label: "Safety Center") {
                                PlaceholderSettingsPage(title: "Safety Center")
                            }
                        }

                        // ── Sign out ──
                        Button {
                            auth.signOut()
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "rectangle.portrait.and.arrow.right")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.red)
                                    .frame(width: 28)
                                Text("Sign Out")
                                    .font(.system(size: 15, weight: .medium))
                                    .foregroundColor(.red)
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(Color.relaySurface)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 24)
                }
            }
            .navigationTitle("More")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Profile Card
private struct ProfileCard: View {
    let user: Profile

    var body: some View {
        HStack(spacing: 16) {
            if let urlStr = user.avatarUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { p in
                    if let img = p.image { img.resizable().scaledToFill() }
                    else { avatarFallback }
                }
                .frame(width: 64, height: 64)
                .clipShape(Circle())
            } else {
                avatarFallback
                    .frame(width: 64, height: 64)
                    .clipShape(Circle())
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(user.displayName ?? "User")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.relayText)
                if let rating = user.rating, rating > 0 {
                    StarRating(rating: rating, count: user.ratingCount)
                }
                if let tier = user.membershipTier, tier != "guest" {
                    Text(tier == "relay_plus" ? "Relay+" : tier.capitalized)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.relayPrimary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.relayPrimary.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(.relayMuted.opacity(0.5))
        }
        .padding(16)
        .background(Color.relaySurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, 16)
    }

    private var avatarFallback: some View {
        ZStack {
            Circle().fill(Color.relayPrimary.opacity(0.12))
            Text(String((user.displayName ?? "U").prefix(1)).uppercased())
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(.relayPrimary)
        }
    }
}

// MARK: - Menu Section
private struct MenuSection<Content: View>: View {
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

// MARK: - Menu Row (generic NavigationLink)
private struct MenuRow<Destination: View>: View {
    let icon: String
    let label: String
    @ViewBuilder let destination: () -> Destination

    var body: some View {
        NavigationLink {
            destination()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.relayPrimary)
                    .frame(width: 28)
                Text(label)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.relayText)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.relayMuted.opacity(0.5))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
    }
}
