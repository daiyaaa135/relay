//
//  HomeView.swift
//  Relay
//

import SwiftUI

struct HomeView: View {
    @State private var gadgets: [Gadget] = []
    @State private var loading = true
    @State private var searchText = ""
    @State private var selectedCategory = "Explore"

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
            .navigationTitle("Relay")
            .searchable(text: $searchText, prompt: "Search gadgets")
            .refreshable { await loadGadgets() }
            .task { await loadGadgets() }
            .navigationDestination(for: Gadget.self) { gadget in
                ListingDetailView(gadget: gadget)
            }
        }
    }

    private func loadGadgets() async {
        loading = true
        do {
            let category = selectedCategory == "Explore" ? nil : selectedCategory
            gadgets = try await APIClient.shared.fetchGadgets(category: category)
        } catch {
            gadgets = []
        }
        loading = false
    }
}

struct GadgetRow: View {
    let gadget: Gadget

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: gadget.image)) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                default: Color.gray.opacity(0.3)
                }
            }
            .frame(width: 72, height: 72)
            .clipped()
            .cornerRadius(8)

            VStack(alignment: .leading, spacing: 4) {
                Text(gadget.name)
                    .font(.headline)
                    .lineLimit(1)
                Text(gadget.brand)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                HStack {
                    Text("\(gadget.credits) credits")
                        .font(.subheadline.bold())
                        .foregroundColor(Color(red: 1, green: 0.34, blue: 0.13))
                    if let loc = gadget.location {
                        Text("• \(loc.city), \(loc.state)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
