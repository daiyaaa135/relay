//
//  ListingDetailView.swift
//  Rellaey IOS
//

import SwiftUI

struct ListingDetailView: View {
    let gadget: Gadget
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var auth: AuthService
    @Environment(\.dismiss) var dismiss

    @State private var currentImageIndex = 0
    @State private var isBusy = false
    @State private var actionError: String?
    @State private var pendingConversation: Conversation?
    @State private var navigateToChat = false

    private var allImages: [String] {
        let imgs = gadget.images ?? []
        return imgs.isEmpty ? [gadget.image] : imgs
    }

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    imageCarousel

                    VStack(alignment: .leading, spacing: 20) {
                        // Title + badges
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(gadget.name)
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(.relayText)
                                Text(gadget.brand)
                                    .font(.system(size: 14))
                                    .foregroundColor(.relayMuted)
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 6) {
                                CreditBadge(credits: gadget.credits)
                                ConditionBadge(condition: gadget.condition)
                            }
                            .padding(.top, 2)
                        }

                        // Specs pills
                        if !gadget.specs.isEmpty {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach(gadget.specs.components(separatedBy: ", ").filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }, id: \.self) { spec in
                                        Text(spec.trimmingCharacters(in: .whitespaces))
                                            .font(.system(size: 12, weight: .medium))
                                            .foregroundColor(.relayText)
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                            .background(Color.relayInput.opacity(0.7))
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }

                        // Description
                        if let desc = gadget.description, !desc.isEmpty {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("ABOUT")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(.relayMuted)
                                    .tracking(0.8)
                                Text(desc)
                                    .font(.system(size: 15))
                                    .foregroundColor(.relayText)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .lineSpacing(3)
                            }
                        }

                        // Location
                        if let loc = gadget.location {
                            HStack(spacing: 8) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(.relayPrimary)
                                    .font(.system(size: 15))
                                Text("\(loc.city), \(loc.state)")
                                    .font(.system(size: 14))
                                    .foregroundColor(.relayMuted)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 10)
                            .background(Color.relayInput.opacity(0.4))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }

                        Divider()

                        // Seller
                        DetailSellerCard(gadget: gadget)

                        // Error
                        if let err = actionError {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.circle.fill").foregroundColor(.red)
                                Text(err).font(.system(size: 13)).foregroundColor(.red.opacity(0.8))
                            }
                            .padding(12)
                            .background(Color.red.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }

                        // Action buttons
                        VStack(spacing: 10) {
                            Button { handleAction() } label: {
                                HStack(spacing: 8) {
                                    if isBusy {
                                        ProgressView().tint(.white).scaleEffect(0.85)
                                    } else {
                                        Image(systemName: "arrow.triangle.2.circlepath")
                                            .font(.system(size: 14, weight: .semibold))
                                    }
                                    Text("Start Swap")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity).frame(height: 54)
                                .background(Color.relayPrimary.opacity(isBusy ? 0.7 : 1))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                            }
                            .disabled(isBusy)

                            Button { handleAction() } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "message")
                                        .font(.system(size: 14, weight: .semibold))
                                    Text("Message Seller")
                                        .font(.system(size: 15, weight: .semibold))
                                }
                                .foregroundColor(.relayPrimary)
                                .frame(maxWidth: .infinity).frame(height: 50)
                                .background(Color.relayPrimary.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.relayPrimary.opacity(0.25), lineWidth: 1))
                            }
                            .disabled(isBusy)
                        }
                        .padding(.top, 4)
                    }
                    .padding(20)
                    .padding(.bottom, 40)
                }
            }

            // Hidden nav link for chat
            NavigationLink(
                destination: pendingConversation.map { ChatView(conversation: $0) },
                isActive: $navigateToChat
            ) { EmptyView() }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    appState.wishlistIds.toggle(gadget.id)
                } label: {
                    Image(systemName: appState.wishlistIds.contains(gadget.id) ? "heart.fill" : "heart")
                        .foregroundColor(appState.wishlistIds.contains(gadget.id) ? .relayPrimary : .relayText)
                        .font(.system(size: 17))
                }
            }
        }
        .onAppear   { appState.tabBarVisible = false }
        .onDisappear { appState.tabBarVisible = true }
    }

    // MARK: - Image carousel
    private var imageCarousel: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $currentImageIndex) {
                ForEach(Array(allImages.enumerated()), id: \.offset) { idx, urlStr in
                    AsyncImage(url: URL(string: urlStr)) { phase in
                        switch phase {
                        case .success(let img):
                            img.resizable().scaledToFill()
                        default:
                            Color.relayInput
                                .overlay(
                                    Image(systemName: categoryIconName(gadget.category))
                                        .font(.system(size: 64, weight: .ultraLight))
                                        .foregroundColor(.relayMuted.opacity(0.3))
                                )
                        }
                    }
                    .clipped()
                    .tag(idx)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(height: 340)
            .clipped()

            if allImages.count > 1 {
                HStack(spacing: 5) {
                    ForEach(0..<allImages.count, id: \.self) { i in
                        Circle()
                            .fill(i == currentImageIndex ? Color.white : Color.white.opacity(0.45))
                            .frame(width: i == currentImageIndex ? 7 : 5, height: i == currentImageIndex ? 7 : 5)
                            .animation(.easeInOut(duration: 0.15), value: currentImageIndex)
                    }
                }
                .padding(.vertical, 8).padding(.horizontal, 12)
                .background(Color.black.opacity(0.3))
                .clipShape(Capsule())
                .padding(.bottom, 14)
            }
        }
    }

    // MARK: - Actions
    private func handleAction() {
        guard let sellerId = gadget.sellerId else {
            actionError = "Cannot contact seller — missing profile info."
            return
        }
        isBusy = true
        actionError = nil
        Task {
            do {
                let convId = try await APIClient.shared.getOrCreateConversation(
                    gadgetId: gadget.id,
                    sellerProfileId: sellerId
                )
                await MainActor.run {
                    isBusy = false
                    pendingConversation = Conversation(
                        id: convId,
                        lastMessage: nil,
                        lastMessageAt: nil,
                        unreadCount: 0,
                        otherUser: Profile(
                            id: sellerId,
                            displayName: gadget.seller,
                            avatarUrl: gadget.sellerAvatarUrl,
                            bio: nil,
                            rating: gadget.sellerRating > 0 ? gadget.sellerRating : nil,
                            ratingCount: nil,
                            membershipTier: nil,
                            createdAt: nil
                        ),
                        listingTitle: gadget.name
                    )
                    navigateToChat = true
                }
            } catch {
                await MainActor.run {
                    isBusy = false
                    actionError = "Couldn't open conversation. Try again."
                }
            }
        }
    }

    private func categoryIconName(_ cat: String) -> String {
        switch cat.lowercased() {
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
}

// MARK: - Seller Card
private struct DetailSellerCard: View {
    let gadget: Gadget

    var body: some View {
        HStack(spacing: 12) {
            if let urlStr = gadget.sellerAvatarUrl, let url = URL(string: urlStr) {
                AsyncImage(url: url) { p in
                    if let img = p.image { img.resizable().scaledToFill() }
                    else { avatarFallback }
                }
                .frame(width: 52, height: 52)
                .clipShape(Circle())
            } else {
                avatarFallback
                    .frame(width: 52, height: 52)
                    .clipShape(Circle())
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(gadget.seller)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.relayText)
                if gadget.sellerRating > 0 {
                    StarRating(rating: gadget.sellerRating, count: nil)
                }
                if let year = gadget.sellerJoinedAt?.prefix(4) {
                    Text("Member since \(year)")
                        .font(.system(size: 11))
                        .foregroundColor(.relayMuted)
                }
            }
            Spacer()
        }
        .padding(14)
        .background(Color.relayInput.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private var avatarFallback: some View {
        ZStack {
            Circle().fill(Color.relayPrimary.opacity(0.1))
            Text(String(gadget.seller.prefix(1)).uppercased())
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.relayPrimary)
        }
    }
}
