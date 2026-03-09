//
//  WalletView.swift
//  Rellaey IOS
//

import SwiftUI

struct WalletView: View {
    @EnvironmentObject var auth: AuthService
    @State private var transactions: [Transaction] = []
    @State private var loading = true

    private var creditsBalance: Int {
        auth.currentUser?.creditsBalance ?? 0
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                if loading {
                    WalletSkeleton()
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // ── Credits balance card ──
                            CreditsCard(balance: creditsBalance)

                            // ── Transaction history ──
                            if transactions.isEmpty {
                                EmptyTransactionsView()
                            } else {
                                VStack(alignment: .leading, spacing: 0) {
                                    Text("HISTORY")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundColor(.relayMuted)
                                        .padding(.horizontal, 20)
                                        .padding(.bottom, 8)

                                    LazyVStack(spacing: 0) {
                                        ForEach(transactions) { tx in
                                            TransactionRow(transaction: tx)
                                            if tx.id != transactions.last?.id {
                                                Divider().padding(.leading, 56)
                                            }
                                        }
                                    }
                                    .background(Color.relaySurface)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .padding(.horizontal, 16)
                                }
                            }
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 32)
                    }
                    .refreshable { await loadData() }
                }
            }
            .navigationTitle("Wallet")
            .navigationBarTitleDisplayMode(.large)
            .task { await loadData() }
        }
    }

    private func loadData() async {
        loading = true
        defer { loading = false }
        guard let userId = auth.currentUser?.id else { return }
        // Refresh profile for latest balance
        if let profile = try? await APIClient.shared.fetchProfile(userId: userId) {
            await MainActor.run { auth.currentUser = profile }
        }
        transactions = (try? await APIClient.shared.fetchTransactions(profileId: userId)) ?? []
    }
}

// MARK: - Credits Card
private struct CreditsCard: View {
    let balance: Int

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient.relayPrimary)
                .shadow(color: Color.relayPrimary.opacity(0.4), radius: 16, x: 0, y: 8)

            VStack(spacing: 6) {
                Text("Available Credits")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.85))

                Text("\(balance)")
                    .font(.system(size: 52, weight: .bold))
                    .foregroundColor(.white)

                HStack(spacing: 6) {
                    Image(systemName: "arrow.triangle.2.circlepath")
                        .font(.system(size: 12, weight: .semibold))
                    Text("Relay Credits")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(.white.opacity(0.75))
            }
            .padding(.vertical, 32)
        }
        .padding(.horizontal, 16)
    }
}

// MARK: - Transaction Row
private struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 14) {
            // Icon circle
            ZStack {
                Circle()
                    .fill(transaction.isCredit
                          ? Color.conditionNew.opacity(0.12)
                          : Color.conditionPoor.opacity(0.12))
                    .frame(width: 40, height: 40)
                Image(systemName: transaction.isCredit ? "plus.circle.fill" : "minus.circle.fill")
                    .font(.system(size: 18))
                    .foregroundColor(transaction.isCredit ? .conditionNew : .conditionPoor)
            }

            VStack(alignment: .leading, spacing: 3) {
                Text(transaction.description ?? transaction.typeLabel)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.relayText)
                    .lineLimit(1)
                Text(transaction.formattedDate)
                    .font(.system(size: 12))
                    .foregroundColor(.relayMuted)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 3) {
                Text((transaction.isCredit ? "+" : "") + "\(transaction.amount)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(transaction.isCredit ? .conditionNew : .conditionPoor)
                Text("cr")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor((transaction.isCredit ? Color.conditionNew : .conditionPoor).opacity(0.7))
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

// MARK: - Empty State
private struct EmptyTransactionsView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "creditcard")
                .font(.system(size: 40, weight: .ultraLight))
                .foregroundColor(.relayMuted.opacity(0.5))
            Text("No transactions yet")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.relayText)
            Text("Credits earned from listing and swapping appear here.")
                .font(.system(size: 13))
                .foregroundColor(.relayMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .padding(.vertical, 32)
    }
}

// MARK: - Skeleton
private struct WalletSkeleton: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Card skeleton
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.relayInput)
                    .frame(height: 160)
                    .shimmer()
                    .padding(.horizontal, 16)

                // Rows
                LazyVStack(spacing: 0) {
                    ForEach(0..<8, id: \.self) { _ in
                        HStack(spacing: 14) {
                            Circle().fill(Color.relayInput).frame(width: 40, height: 40).shimmer()
                            VStack(alignment: .leading, spacing: 6) {
                                RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 160, height: 13).shimmer()
                                RoundedRectangle(cornerRadius: 4).fill(Color.relayInput).frame(width: 100, height: 11).shimmer()
                            }
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        Divider().padding(.leading, 56)
                    }
                }
                .background(Color.relaySurface)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .padding(.horizontal, 16)
            }
            .padding(.top, 8)
        }
        .disabled(true)
    }
}
