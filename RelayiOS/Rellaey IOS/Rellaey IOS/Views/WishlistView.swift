//
//  WishlistView.swift
//  Rellaey IOS
//

import SwiftUI

struct WishlistView: View {
    @EnvironmentObject var appState: AppState
    @State private var gadgets: [Gadget] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                if loading {
                    ProgressView()
                        .tint(.relayPrimary)
                } else if gadgets.isEmpty {
                    VStack(spacing: 16) {
                        ZStack {
                            Circle()
                                .fill(Color.relayPrimary.opacity(0.1))
                                .frame(width: 80, height: 80)
                            Image(systemName: "heart")
                                .font(.system(size: 32, weight: .light))
                                .foregroundColor(.relayPrimary)
                        }
                        Text("Nothing saved yet")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.relayText)
                        Text("Tap the heart on any listing to save it here.")
                            .font(.system(size: 14))
                            .foregroundColor(.relayMuted)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(gadgets) { gadget in
                                NavigationLink(value: gadget) {
                                    GadgetRow(gadget: gadget)
                                        .padding(.horizontal, 20)
                                        .padding(.vertical, 10)
                                        .background(Color.relaySurface)
                                }
                                .buttonStyle(.plain)
                                Divider().padding(.leading, 20 + 72 + 12)
                            }
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                    }
                    .refreshable { await loadWishlist() }
                    .navigationDestination(for: Gadget.self) { gadget in
                        ListingDetailView(gadget: gadget)
                    }
                }
            }
            .navigationTitle("Wishlist")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadWishlist() }
        }
    }

    private func loadWishlist() async {
        loading = true
        defer { loading = false }
        let ids = Array(appState.wishlistIds)
        guard !ids.isEmpty else { gadgets = []; return }
        gadgets = (try? await APIClient.shared.fetchGadgetsByIds(ids)) ?? []
    }
}
