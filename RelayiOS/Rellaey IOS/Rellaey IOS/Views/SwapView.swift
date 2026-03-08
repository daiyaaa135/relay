//
//  SwapView.swift
//  Rellaey IOS
//

import SwiftUI

struct SwapView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            ZStack {
                Color.relayBackground.ignoresSafeArea()

                VStack(spacing: 0) {
                    Spacer()

                    // Icon
                    ZStack {
                        Circle()
                            .fill(Color.relayPrimary.opacity(0.1))
                            .frame(width: 100, height: 100)
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 40, weight: .semibold))
                            .foregroundColor(.relayPrimary)
                    }
                    .padding(.bottom, 28)

                    Text("Start a Swap")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.relayText)
                        .padding(.bottom, 12)

                    Text("List a gadget or browse what others have. When you find something you want, propose a swap — no money needed.")
                        .font(.system(size: 15))
                        .foregroundColor(.relayMuted)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 36)

                    // How it works
                    VStack(spacing: 0) {
                        HowItWorksRow(step: "1", icon: "plus.circle", title: "List your device", subtitle: "Add photos, specs, and your swap preferences.")
                        Divider().padding(.leading, 56)
                        HowItWorksRow(step: "2", icon: "magnifyingglass", title: "Browse listings", subtitle: "Find gadgets near you that you want.")
                        Divider().padding(.leading, 56)
                        HowItWorksRow(step: "3", icon: "checkmark.seal", title: "Agree & swap", subtitle: "Meet up, verify condition, and complete the trade.")
                    }
                    .background(Color.relaySurface)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)

                    Button {
                        appState.selectedTab = .home
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "arrow.right")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Browse listings")
                                .font(.system(size: 15, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.relayPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .padding(.horizontal, 20)
                    }

                    Spacer()
                }
            }
            .navigationTitle("Swap")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

private struct HowItWorksRow: View {
    let step: String
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color.relayPrimary.opacity(0.1))
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.relayPrimary)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.relayText)
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundColor(.relayMuted)
            }
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}
