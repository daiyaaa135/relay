//
//  MessagesView.swift
//  Rellaey IOS
//

import SwiftUI

struct MessagesView: View {
    @EnvironmentObject var auth: AuthService
    @State private var conversations: [Conversation] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                if loading {
                    ConversationSkeletonList()
                } else if conversations.isEmpty {
                    EmptyMessagesView()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 0) {
                            ForEach(conversations) { conv in
                                NavigationLink {
                                    ChatView(conversation: conv)
                                } label: {
                                    ConversationRow(conv: conv)
                                }
                                .buttonStyle(.plain)
                                Divider().padding(.leading, 20 + 48 + 12)
                            }
                        }
                        .background(Color.relaySurface)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                    }
                    .refreshable { await loadConversations() }
                }
            }
            .navigationTitle("Messages")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadConversations() }
        }
    }

    private func loadConversations() async {
        loading = true
        defer { loading = false }
        guard let userId = auth.currentUser?.id else { return }
        conversations = (try? await APIClient.shared.fetchConversations(profileId: userId)) ?? []
    }
}

// MARK: - Empty State
private struct EmptyMessagesView: View {
    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.relayPrimary.opacity(0.1))
                    .frame(width: 80, height: 80)
                Image(systemName: "message")
                    .font(.system(size: 32, weight: .light))
                    .foregroundColor(.relayPrimary)
            }
            Text("No messages yet")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.relayText)
            Text("When you start a swap, conversations appear here.")
                .font(.system(size: 14))
                .foregroundColor(.relayMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
    }
}

// MARK: - Skeleton
private struct ConversationSkeletonList: View {
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(0..<6, id: \.self) { _ in
                    ConversationSkeletonRow()
                    Divider().padding(.leading, 20 + 48 + 12)
                }
            }
            .background(Color.relaySurface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 16)
            .padding(.top, 16)
        }
        .disabled(true)
    }
}

private struct ConversationSkeletonRow: View {
    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.relayInput)
                .frame(width: 48, height: 48)
                .shimmer()
            VStack(alignment: .leading, spacing: 6) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.relayInput)
                    .frame(width: 140, height: 13)
                    .shimmer()
                RoundedRectangle(cornerRadius: 4)
                    .fill(Color.relayInput)
                    .frame(width: 200, height: 11)
                    .shimmer()
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// MARK: - Conversation Row
private struct ConversationRow: View {
    let conv: Conversation

    var body: some View {
        HStack(spacing: 12) {
            if let other = conv.otherUser, let urlString = other.avatarUrl, let url = URL(string: urlString) {
                AsyncImage(url: url) { p in
                    if let img = p.image { img.resizable().scaledToFill() }
                    else { avatarPlaceholder(name: other.displayName ?? "?") }
                }
                .frame(width: 48, height: 48)
                .clipShape(Circle())
            } else {
                avatarPlaceholder(name: conv.otherUser?.displayName ?? "?")
                    .frame(width: 48, height: 48)
                    .clipShape(Circle())
            }

            VStack(alignment: .leading, spacing: 3) {
                HStack {
                    Text(conv.otherUser?.displayName ?? "User")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.relayText)
                        .lineLimit(1)
                    Spacer()
                    if let dateStr = conv.lastMessageAt {
                        Text(shortDate(dateStr))
                            .font(.system(size: 11))
                            .foregroundColor(.relayMuted)
                    }
                }
                if let title = conv.listingTitle {
                    Text(title)
                        .font(.system(size: 13))
                        .foregroundColor(.relayMuted)
                        .lineLimit(1)
                } else if let last = conv.lastMessage {
                    Text(last)
                        .font(.system(size: 13))
                        .foregroundColor(.relayMuted)
                        .lineLimit(1)
                }
            }

            if (conv.unreadCount ?? 0) > 0 {
                Text("\(conv.unreadCount!)")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.white)
                    .frame(minWidth: 20, minHeight: 20)
                    .padding(.horizontal, 5)
                    .background(Color.relayPrimary)
                    .clipShape(Capsule())
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func avatarPlaceholder(name: String) -> some View {
        ZStack {
            Circle().fill(Color.relayInput)
            Text(String(name.prefix(1)).uppercased())
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.relayMuted)
        }
    }

    private func shortDate(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return String(iso.prefix(10)) }
        let df = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            df.dateFormat = "h:mm a"
        } else {
            df.dateFormat = "MMM d"
        }
        return df.string(from: date)
    }
}

// MARK: - Chat View
struct ChatView: View {
    let conversation: Conversation
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var appState: AppState
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var loading = true
    @State private var sending = false

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            VStack(spacing: 0) {
                if loading {
                    ProgressView().tint(.relayPrimary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 10) {
                                ForEach(messages) { msg in
                                    MessageBubble(
                                        message: msg,
                                        isMine: msg.senderId == auth.currentUser?.id
                                    )
                                    .id(msg.id)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                        }
                        .onChange(of: messages.count) {
                            if let last = messages.last {
                                withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                            }
                        }
                        .onAppear {
                            if let last = messages.last {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                // Input bar
                HStack(spacing: 10) {
                    TextField("Message…", text: $inputText, axis: .vertical)
                        .font(.system(size: 15))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.relayInput.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                        .lineLimit(5)

                    Button {
                        Task { await sendMessage() }
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(
                                inputText.trimmingCharacters(in: .whitespaces).isEmpty || sending
                                    ? Color.relayMuted.opacity(0.4)
                                    : Color.relayPrimary
                            )
                            .clipShape(Circle())
                    }
                    .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || sending)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(.ultraThinMaterial)
                .overlay(
                    Rectangle().fill(Color.relayMuted.opacity(0.12)).frame(height: 0.5),
                    alignment: .top
                )
            }
        }
        .navigationTitle(conversation.otherUser?.displayName ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadMessages() }
        .onAppear   { appState.tabBarVisible = false }
        .onDisappear { appState.tabBarVisible = true }
    }

    private func loadMessages() async {
        loading = true
        messages = (try? await APIClient.shared.fetchMessages(conversationId: conversation.id)) ?? []
        loading = false
    }

    private func sendMessage() async {
        let trimmed = inputText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, let senderId = auth.currentUser?.id else { return }
        inputText = ""
        sending = true
        do {
            let msg = try await APIClient.shared.sendMessage(
                conversationId: conversation.id,
                content: trimmed,
                senderProfileId: senderId
            )
            Haptics.light()
            messages.append(msg)
        } catch {
            inputText = trimmed
            Haptics.error()
        }
        sending = false
    }
}

// MARK: - Message Bubble
private struct MessageBubble: View {
    let message: ChatMessage
    let isMine: Bool

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 60) }
            VStack(alignment: isMine ? .trailing : .leading, spacing: 4) {
                Text(message.body)
                    .font(.system(size: 15))
                    .foregroundColor(isMine ? .white : .relayText)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 9)
                    .background(isMine ? Color.relayPrimary : Color.relaySurface)
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                    .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
                Text(shortTime(message.createdAt))
                    .font(.system(size: 10))
                    .foregroundColor(.relayMuted)
                    .padding(.horizontal, 4)
            }
            if !isMine { Spacer(minLength: 60) }
        }
    }

    private func shortTime(_ iso: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return "" }
        let df = DateFormatter()
        if Calendar.current.isDateInToday(date) {
            df.dateFormat = "h:mm a"
        } else {
            df.dateFormat = "MMM d, h:mm a"
        }
        return df.string(from: date)
    }
}
