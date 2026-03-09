//
//  SwapsView.swift
//  Rellaey IOS
//

import SwiftUI

struct SwapsView: View {
    @EnvironmentObject var auth: AuthService
    @State private var swaps: [Swap] = []
    @State private var loading = true
    @State private var selectedTab = 0   // 0 = Incoming, 1 = Outgoing

    private var incoming: [Swap] {
        swaps.filter { $0.buyerProfileId == auth.currentUser?.id }
    }

    private var outgoing: [Swap] {
        swaps.filter { $0.sellerProfileId == auth.currentUser?.id }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Segment control
                    Picker("Swaps", selection: $selectedTab) {
                        Text("Incoming").tag(0)
                        Text("Outgoing").tag(1)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)

                    if loading {
                        SwapSkeletonList()
                    } else {
                        let list = selectedTab == 0 ? incoming : outgoing
                        if list.isEmpty {
                            EmptySwapsView(isIncoming: selectedTab == 0)
                        } else {
                            ScrollView {
                                LazyVStack(spacing: 12) {
                                    ForEach(list) { swap in
                                        SwapCard(swap: swap, isIncoming: swap.buyerProfileId == auth.currentUser?.id)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                            }
                            .refreshable { await loadSwaps() }
                        }
                    }
                }
            }
            .navigationTitle("My Swaps")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadSwaps() }
        }
    }

    private func loadSwaps() async {
        loading = true
        defer { loading = false }
        guard let userId = auth.currentUser?.id else { return }
        swaps = (try? await APIClient.shared.fetchSwaps(profileId: userId)) ?? []
    }
}

// MARK: - Swap Card
private struct SwapCard: View {
    let swap: Swap
    let isIncoming: Bool

    private var otherProfile: SwapProfileEmbed? {
        isIncoming ? swap.sellerProfile : swap.buyerProfile
    }

    private var gadgetImage: String? {
        swap.gadget?.imageUrls?.first
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                // Gadget thumbnail
                AsyncImage(url: URL(string: gadgetImage ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().scaledToFill()
                    default:
                        Color.relayInput
                            .overlay(
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.system(size: 20, weight: .ultraLight))
                                    .foregroundColor(.relayMuted.opacity(0.4))
                            )
                    }
                }
                .frame(width: 64, height: 64)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                VStack(alignment: .leading, spacing: 4) {
                    Text(swap.gadget?.name ?? "Listing")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.relayText)
                        .lineLimit(1)

                    if let other = otherProfile {
                        Text(isIncoming ? "From \(other.displayName ?? "Seller")" : "To \(other.displayName ?? "Buyer")")
                            .font(.system(size: 12))
                            .foregroundColor(.relayMuted)
                    }

                    HStack(spacing: 6) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 10, weight: .semibold))
                        Text("\(swap.creditsAmount) credits")
                            .font(.system(size: 12, weight: .semibold))
                    }
                    .foregroundColor(.relayPrimary)
                }

                Spacer()

                ConditionBadge(condition: swap.statusLabel)
            }
            .padding(14)
        }
        .background(Color.relaySurface)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 6, x: 0, y: 2)
    }
}

// MARK: - Empty State
private struct EmptySwapsView: View {
    let isIncoming: Bool

    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            ZStack {
                Circle()
                    .fill(Color.relayPrimary.opacity(0.1))
                    .frame(width: 80, height: 80)
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 32, weight: .light))
                    .foregroundColor(.relayPrimary)
            }
            Text(isIncoming ? "No incoming swaps" : "No outgoing swaps")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.relayText)
            Text(isIncoming
                 ? "When someone proposes a swap for your listing, it appears here."
                 : "When you propose a swap, it appears here."
            )
            .font(.system(size: 14))
            .foregroundColor(.relayMuted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 40)
            Spacer()
        }
    }
}

// MARK: - Skeleton
private struct SwapSkeletonList: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(0..<5, id: \.self) { _ in
                    HStack(spacing: 12) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.relayInput)
                            .frame(width: 64, height: 64)
                            .shimmer()
                        VStack(alignment: .leading, spacing: 6) {
                            RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 150, height: 13).shimmer()
                            RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 100, height: 11).shimmer()
                        }
                        Spacer()
                    }
                    .padding(14)
                    .background(Color.relaySurface)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .disabled(true)
    }
}
