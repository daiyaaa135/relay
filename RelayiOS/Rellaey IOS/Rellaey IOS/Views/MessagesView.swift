//
//  MessagesView.swift
//  Rellaey IOS
//

import SwiftUI

struct MessagesView: View {
    @State private var conversations: [Conversation] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                if loading {
                    ProgressView().tint(.relayPrimary)
                } else if conversations.isEmpty {
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
            .refreshable { await loadConversations() }
        }
    }

    private func loadConversations() async {
        loading = true
        conversations = []
        loading = false
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
                        Text(dateStr.prefix(10))
                            .font(.system(size: 11))
                            .foregroundColor(.relayMuted)
                    }
                }
                if let last = conv.lastMessage {
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
}

// MARK: - Chat View
struct ChatView: View {
    let conversation: Conversation
    @EnvironmentObject var auth: AuthService
    @EnvironmentObject var appState: AppState
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var loading = true

    var body: some View {
        ZStack {
            Color.relayBackground.ignoresSafeArea()

            VStack(spacing: 0) {
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
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }

                HStack(spacing: 10) {
                    TextField("Message…", text: $inputText, axis: .vertical)
                        .font(.system(size: 15))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.relayInput.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                        .lineLimit(5)

                    Button {
                        sendMessage()
                    } label: {
                        Image(systemName: "arrow.up")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 36, height: 36)
                            .background(
                                inputText.trimmingCharacters(in: .whitespaces).isEmpty
                                    ? Color.relayMuted.opacity(0.4)
                                    : Color.relayPrimary
                            )
                            .clipShape(Circle())
                    }
                    .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty)
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
        messages = []
        loading = false
    }

    private func sendMessage() {
        let trimmed = inputText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        inputText = ""
    }
}

// MARK: - Message Bubble
private struct MessageBubble: View {
    let message: ChatMessage
    let isMine: Bool

    var body: some View {
        HStack {
            if isMine { Spacer(minLength: 60) }
            Text(message.body)
                .font(.system(size: 15))
                .foregroundColor(isMine ? .white : .relayText)
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(isMine ? Color.relayPrimary : Color.relaySurface)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .shadow(color: .black.opacity(0.04), radius: 4, x: 0, y: 2)
            if !isMine { Spacer(minLength: 60) }
        }
    }
}
