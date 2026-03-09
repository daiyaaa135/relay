//
//  ProfileView.swift
//  Rellaey IOS
//

import SwiftUI
import PhotosUI

// MARK: - Own Profile + Edit
struct ProfileView: View {
    @EnvironmentObject var auth: AuthService
    @State private var isEditing = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                if let user = auth.currentUser {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Avatar + name header
                            ProfileHeaderSection(user: user)

                            // Stats row
                            ProfileStatsRow(user: user)

                            // My Listings
                            MyListingsSection()
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                } else {
                    ProgressView().tint(.relayPrimary)
                }
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink {
                        EditProfileView()
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.relayPrimary)
                    }
                }
            }
        }
    }
}

// MARK: - Profile Header
private struct ProfileHeaderSection: View {
    let user: Profile

    var body: some View {
        VStack(spacing: 16) {
            // Avatar
            if let urlStr = user.avatarUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { p in
                    if let img = p.image { img.resizable().scaledToFill() }
                    else { avatarFallback }
                }
                .frame(width: 90, height: 90)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.relayPrimary.opacity(0.2), lineWidth: 2))
            } else {
                avatarFallback
                    .frame(width: 90, height: 90)
                    .clipShape(Circle())
            }

            VStack(spacing: 6) {
                Text(user.displayName ?? "User")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.relayText)

                if let rating = user.rating, rating > 0 {
                    StarRating(rating: rating, count: user.ratingCount)
                }

                if let tier = user.membershipTier, tier != "guest" {
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.system(size: 11))
                        Text(tier == "relay_plus" ? "Relay+" : tier.capitalized)
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.relayPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.relayPrimary.opacity(0.1))
                    .clipShape(Capsule())
                }

                if let bio = user.bio, !bio.isEmpty {
                    Text(bio)
                        .font(.system(size: 13))
                        .foregroundColor(.relayMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }

                if let year = user.createdAt?.prefix(4) {
                    Text("Member since \(year)")
                        .font(.system(size: 11))
                        .foregroundColor(.relayMuted)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .padding(.horizontal, 16)
        .background(Color.relaySurface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, 16)
    }

    private var avatarFallback: some View {
        ZStack {
            Circle().fill(Color.relayPrimary.opacity(0.12))
            Text(String((user.displayName ?? "U").prefix(1)).uppercased())
                .font(.system(size: 30, weight: .bold))
                .foregroundColor(.relayPrimary)
        }
    }
}

// MARK: - Stats Row
private struct ProfileStatsRow: View {
    let user: Profile

    var body: some View {
        HStack(spacing: 0) {
            StatItem(value: "\(user.creditsBalance ?? 0)", label: "Credits")
            Divider().frame(height: 36)
            StatItem(value: user.rating.map { String(format: "%.1f", $0) } ?? "–", label: "Rating")
            Divider().frame(height: 36)
            StatItem(value: "\(user.ratingCount ?? 0)", label: "Reviews")
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color.relaySurface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 16)
    }
}

private struct StatItem: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 20, weight: .bold))
                .foregroundColor(.relayText)
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.relayMuted)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - My Listings Section
private struct MyListingsSection: View {
    @EnvironmentObject var auth: AuthService
    @State private var gadgets: [Gadget] = []
    @State private var loading = true

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("MY LISTINGS")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(.relayMuted)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)

            if loading {
                ProgressView().tint(.relayPrimary)
                    .frame(maxWidth: .infinity).padding(.vertical, 32)
            } else if gadgets.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "tray")
                        .font(.system(size: 36, weight: .ultraLight))
                        .foregroundColor(.relayMuted.opacity(0.5))
                    Text("No listings yet")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.relayText)
                    Text("List a gadget from the Swap tab.")
                        .font(.system(size: 13))
                        .foregroundColor(.relayMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
                .background(Color.relaySurface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.horizontal, 16)
            } else {
                LazyVStack(spacing: 0) {
                    ForEach(gadgets) { gadget in
                        NavigationLink(value: gadget) {
                            GadgetRow(gadget: gadget)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                        }
                        .buttonStyle(.plain)
                        if gadget.id != gadgets.last?.id {
                            Divider().padding(.leading, 20 + 72 + 12)
                        }
                    }
                }
                .background(Color.relaySurface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.horizontal, 16)
                .navigationDestination(for: Gadget.self) { ListingDetailView(gadget: $0) }
            }
        }
        .task { await load() }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let userId = auth.currentUser?.id else { return }
        gadgets = (try? await APIClient.shared.fetchMyListings(profileId: userId)) ?? []
    }
}

// MARK: - Edit Profile
struct EditProfileView: View {
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss
    @State private var displayName: String = ""
    @State private var bio: String = ""
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    // Fields
                    VStack(spacing: 12) {
                        RelayInputField(systemImage: "person", placeholder: "Display name", text: $displayName)
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Bio")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.relayMuted)
                                .padding(.horizontal, 4)
                            TextEditor(text: $bio)
                                .font(.system(size: 15))
                                .frame(height: 100)
                                .padding(12)
                                .background(Color.relayInput.opacity(0.6))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .scrollContentBackground(.hidden)
                        }
                    }
                    .padding(.horizontal, 16)

                    if let err = error {
                        Text(err)
                            .font(.system(size: 13))
                            .foregroundColor(.red)
                            .padding(.horizontal, 16)
                    }

                    RelayPrimaryButton(title: "Save Changes", isLoading: loading) {
                        Task { await save() }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.top, 20)
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            displayName = auth.currentUser?.displayName ?? ""
            bio = auth.currentUser?.bio ?? ""
        }
    }

    private func save() async {
        loading = true
        error = nil
        guard let userId = auth.currentUser?.id else { loading = false; return }
        do {
            try await APIClient.shared.updateProfile(userId: userId, displayName: displayName, bio: bio)
            Haptics.success()
            await auth.fetchProfile()
            dismiss()
        } catch {
            self.error = "Failed to save. Please try again."
            Haptics.error()
        }
        loading = false
    }
}
