//
//  MessagesView.swift
//  Relay
//

import SwiftUI

struct MessagesView: View {
    @State private var conversations: [Conversation] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if conversations.isEmpty {
                    ContentUnavailableView(
                        "No messages",
                        systemImage: "message",
                        description: Text("When you start a swap, conversations will appear here.")
                    )
                } else {
                    List(conversations) { conv in
                        NavigationLink {
                            ChatView(conversation: conv)
                        } label: {
                            HStack {
                                if let other = conv.otherUser, let urlString = other.avatarUrl, let url = URL(string: urlString) {
                                    AsyncImage(url: url) { p in p.image?.resizable() ?? Color.gray.opacity(0.3).opacity(0.3) }
                                        .frame(width: 44, height: 44)
                                        .clipShape(Circle())
                                }
                                VStack(alignment: .leading) {
                                    Text(conv.otherUser?.displayName ?? "User")
                                        .font(.headline)
                                    if let last = conv.lastMessage {
                                        Text(last)
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer()
                                if (conv.unreadCount ?? 0) > 0 {
                                    Text("\(conv.unreadCount!)")
                                        .font(.caption.bold())
                                        .foregroundColor(.white)
                                        .padding(6)
                                        .background(Color(red: 1, green: 0.34, blue: 0.13))
                                        .clipShape(Circle())
                                }
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Messages")
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

struct ChatView: View {
    let conversation: Conversation
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""

    var body: some View {
        VStack {
            List(messages) { msg in
                Text(msg.body)
                    .padding(8)
                    .background(msg.senderId == conversation.id ? Color.gray.opacity(0.2) : Color(red: 1, green: 0.34, blue: 0.13).opacity(0.2))
                    .cornerRadius(12)
                    .frame(maxWidth: .infinity, alignment: msg.senderId == conversation.id ? .leading : .trailing)
            }
            .listStyle(.plain)
            HStack {
                TextField("Message", text: $inputText)
                    .textFieldStyle(.roundedBorder)
                Button("Send") { }
                    .buttonStyle(.borderedProminent)
                    .tint(Color(red: 1, green: 0.34, blue: 0.13))
            }
            .padding()
        }
        .navigationTitle(conversation.otherUser?.displayName ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
    }
}
