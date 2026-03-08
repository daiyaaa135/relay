//
//  MoreView.swift
//  Relay
//

import SwiftUI

struct MoreView: View {
    @EnvironmentObject var auth: AuthService

    var body: some View {
        NavigationStack {
            List {
                if let user = auth.currentUser {
                    Section {
                        HStack {
                            if let urlString = user.avatarUrl, let url = URL(string: urlString) {
                                AsyncImage(url: url) { phase in
                                    Group {
                                        if let image = phase.image { image.resizable() }
                                        else { Color.gray.opacity(0.3) }
                                    }
                                }
                                    .frame(width: 56, height: 56)
                                    .clipShape(Circle())
                            }
                            VStack(alignment: .leading) {
                                Text(user.displayName ?? "User")
                                    .font(.headline)
                                if let rating = user.rating {
                                    Text(String(format: "%.1f ★", rating))
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section("Account") {
                    NavigationLink("Profile") { ProfilePlaceholderView() }
                    NavigationLink("Listings") { Text("My listings").padding() }
                    NavigationLink("Wallet") { Text("Wallet").padding() }
                }

                Section("Preferences") {
                    NavigationLink("Settings") { Text("Settings").padding() }
                    NavigationLink("Notifications") { Text("Notifications").padding() }
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        auth.signOut()
                    }
                }
            }
            .navigationTitle("More")
        }
    }
}

struct ProfilePlaceholderView: View {
    var body: some View {
        Text("Edit profile")
            .padding()
    }
}
