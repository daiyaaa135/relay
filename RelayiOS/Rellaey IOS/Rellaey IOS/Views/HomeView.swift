//
//  HomeView.swift
//  Rellaey IOS
//
//  Home feed matching the Next.js design: category carousel + golden-ratio listing cards
//

import SwiftUI

private let categories = ["Explore", "Phones", "Laptops", "Tablets", "Headphones", "Cameras", "Gaming", "Wearables"]

struct HomeView: View {
    @State private var gadgets: [Gadget] = []
    @State private var loading = true
    @State private var selectedCategory = "Explore"
    @State private var showFilter = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color.relayBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // ── Top bar: filter + category carousel ──
                    TopBar(
                        selectedCategory: $selectedCategory,
                        showFilter: $showFilter,
                        onCategoryChange: { Task { await loadGadgets() } }
                    )
                    .background(.ultraThinMaterial)
                    .overlay(
                        Rectangle()
                            .fill(Color.relayMuted.opacity(0.1))
                            .frame(height: 0.5),
                        alignment: .bottom
                    )

                    // ── Content ──
                    if loading {
                        SkeletonFeed()
                    } else if gadgets.isEmpty {
                        EmptyFeed()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 32) {
                                ForEach(gadgets) { gadget in
                                    NavigationLink(value: gadget) {
                                        GadgetCard(gadget: gadget)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 20)
                            .padding(.vertical, 20)
                        }
                        .refreshable { await loadGadgets() }
                    }
                }
            }
            .navigationBarHidden(true)
            .navigationDestination(for: Gadget.self) { gadget in
                ListingDetailView(gadget: gadget)
            }
            .task { await loadGadgets() }
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

// MARK: - Top Bar
private struct TopBar: View {
    @Binding var selectedCategory: String
    @Binding var showFilter: Bool
    let onCategoryChange: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            // Logo row
            HStack {
                Text("Relay")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.relayPrimary)
                Spacer()
                Button {
                    showFilter = true
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundColor(.relayText)
                        .frame(width: 40, height: 40)
                        .background(Color.relayInput.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 10)

            // Category chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(categories, id: \.self) { cat in
                        CategoryChip(label: cat, isSelected: selectedCategory == cat) {
                            selectedCategory = cat
                            onCategoryChange()
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 10)
            }
        }
    }
}

// MARK: - Category Chip
private struct CategoryChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.system(size: 13, weight: isSelected ? .semibold : .medium))
                .foregroundColor(isSelected ? .relayText : .relayMuted)
                .padding(.horizontal, 16)
                .padding(.vertical, 7)
                .background(
                    isSelected
                        ? Color.relayInput.opacity(0.9)
                        : Color.clear
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(
                            isSelected ? Color.relayMuted.opacity(0.25) : Color.relayMuted.opacity(0.15),
                            lineWidth: 1
                        )
                )
        }
        .animation(.easeInOut(duration: 0.15), value: isSelected)
    }
}

// MARK: - Gadget Card (golden ratio)
struct GadgetCard: View {
    let gadget: Gadget
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // ── Image container (golden ratio 1:1.618) ──
            // Use Color.clear to establish reliable aspect-ratio size, then overlay image
            ZStack(alignment: .topLeading) {
                // Sizing anchor — gives the ZStack its correct dimensions
                Color.relayInput
                    .aspectRatio(1.0 / 1.618, contentMode: .fit)

                // Actual photo
                AsyncImage(url: URL(string: gadget.image)) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    default:
                        Color.relayInput
                            .overlay(
                                Image(systemName: categoryIcon(for: gadget.category))
                                    .font(.system(size: 52, weight: .ultraLight))
                                    .foregroundColor(.relayMuted.opacity(0.35))
                            )
                    }
                }
                .scaledToFill()
                .clipped()

                // Condition badge (top-left)
                ConditionBadge(condition: gadget.condition)
                    .padding(12)

                // Credit badge (bottom-right)
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        CreditBadge(credits: gadget.credits)
                    }
                }
                .padding(12)

                // Wishlist button (top-right)
                VStack {
                    HStack {
                        Spacer()
                        Button {
                            appState.wishlistIds.toggle(gadget.id)
                        } label: {
                            Image(systemName: appState.wishlistIds.contains(gadget.id) ? "heart.fill" : "heart")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(appState.wishlistIds.contains(gadget.id) ? .relayPrimary : .relayText)
                                .frame(width: 40, height: 40)
                                .background(.ultraThinMaterial)
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 0.5))
                        }
                    }
                    Spacer()
                }
                .padding(12)
            }
            // Clip entire ZStack (image + badges) with rounded corners
            .clipShape(RoundedRectangle(cornerRadius: 28))
            .shadow(color: .black.opacity(0.10), radius: 16, x: 0, y: 6)

            // ── Seller info row ──
            HStack(spacing: 10) {
                // Seller avatar
                if let urlStr = gadget.sellerAvatarUrl, let url = URL(string: urlStr) {
                    AsyncImage(url: url) { p in
                        if let img = p.image { img.resizable().scaledToFill() }
                        else { Color.relayInput }
                    }
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())
                } else {
                    Circle()
                        .fill(Color.relayInput)
                        .frame(width: 36, height: 36)
                        .overlay(
                            Text(String((gadget.seller).prefix(1)).uppercased())
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.relayMuted)
                        )
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(gadget.name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.relayText)
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        Text(gadget.seller)
                            .font(.system(size: 12))
                            .foregroundColor(.relayMuted)
                        if let loc = gadget.location {
                            Text("•")
                                .font(.system(size: 10))
                                .foregroundColor(.relayMuted.opacity(0.5))
                            Text("\(loc.city)")
                                .font(.system(size: 12))
                                .foregroundColor(.relayMuted)
                        }
                    }
                }

                Spacer()

                if gadget.sellerRating > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill")
                            .font(.system(size: 11))
                            .foregroundColor(.yellow)
                        Text(String(format: "%.1f", gadget.sellerRating))
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.relayText)
                    }
                }
            }
        }
    }
}

// MARK: - Empty state
private struct EmptyFeed: View {
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48, weight: .ultraLight))
                .foregroundColor(.relayMuted.opacity(0.5))
            Text("No listings found")
                .font(.system(size: 17, weight: .semibold))
                .foregroundColor(.relayText)
            Text("Try a different category or check back later.")
                .font(.system(size: 14))
                .foregroundColor(.relayMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            Spacer()
        }
    }
}

// MARK: - Skeleton feed
private struct SkeletonFeed: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 32) {
                ForEach(0..<4, id: \.self) { _ in
                    SkeletonCard()
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 20)
        }
        .disabled(true)
    }
}

private struct SkeletonCard: View {
    @State private var shimmer = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            RoundedRectangle(cornerRadius: 28)
                .fill(Color.relayInput)
                .aspectRatio(1 / 1.618, contentMode: .fit)
                .overlay(
                    RoundedRectangle(cornerRadius: 28)
                        .fill(
                            LinearGradient(
                                colors: [.clear, Color.white.opacity(0.4), .clear],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .offset(x: shimmer ? 400 : -400)
                )
                .clipped()

            HStack(spacing: 10) {
                Circle().fill(Color.relayInput).frame(width: 36, height: 36)
                VStack(alignment: .leading, spacing: 6) {
                    RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 160, height: 14)
                    RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 100, height: 11)
                }
                Spacer()
            }
        }
        .onAppear {
            withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                shimmer = true
            }
        }
    }
}

// MARK: - Category icon helper
private func categoryIcon(for category: String) -> String {
    switch category.lowercased() {
    case "phones":     return "iphone.gen3"
    case "laptops":    return "laptopcomputer"
    case "tablets":    return "ipad"
    case "headphones": return "headphones"
    case "cameras":    return "camera"
    case "gaming":     return "gamecontroller"
    case "wearables":  return "applewatch"
    default:           return "cpu"
    }
}

// MARK: - GadgetRow (kept for WishlistView)
struct GadgetRow: View {
    let gadget: Gadget

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: gadget.image)) { phase in
                switch phase {
                case .success(let img): img.resizable().scaledToFill()
                default: Color.relayInput
                }
            }
            .frame(width: 72, height: 72)
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: 4) {
                Text(gadget.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.relayText)
                    .lineLimit(1)
                Text(gadget.brand)
                    .font(.system(size: 13))
                    .foregroundColor(.relayMuted)
                HStack(spacing: 6) {
                    HStack(spacing: 3) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 10, weight: .bold))
                        Text("\(gadget.credits) credits")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(.relayPrimary)
                    if let loc = gadget.location {
                        Text("• \(loc.city)")
                            .font(.system(size: 12))
                            .foregroundColor(.relayMuted)
                    }
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
