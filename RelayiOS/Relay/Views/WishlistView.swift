//
//  WishlistView.swift
//  Relay
//

import SwiftUI

struct WishlistView: View {
    @EnvironmentObject var appState: AppState
    @State private var gadgets: [Gadget] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if gadgets.isEmpty {
                    ContentUnavailableView(
                        "No wishlist items",
                        systemImage: "heart",
                        description: Text("Add items from Home to your wishlist.")
                    )
                } else {
                    List {
                        ForEach(gadgets) { gadget in
                            NavigationLink(value: gadget) {
                                GadgetRow(gadget: gadget)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Wishlist")
            .task { await loadWishlist() }
            .refreshable { await loadWishlist() }
            .navigationDestination(for: Gadget.self) { gadget in
                ListingDetailView(gadget: gadget)
            }
        }
    }

    private func loadWishlist() async {
        loading = true
        // In a full implementation, fetch wishlist IDs from API then fetch those gadgets
        gadgets = []
        loading = false
    }
}
