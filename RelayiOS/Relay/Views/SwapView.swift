//
//  SwapView.swift
//  Relay
//

import SwiftUI

struct SwapView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 60))
                    .foregroundColor(Color(red: 1, green: 0.34, blue: 0.13))
                Text("Start a swap")
                    .font(.title2.bold())
                Text("List a device or browse to find one you want. Then propose a swap with the seller.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                Button {
                    appState.selectedTab = .home
                } label: {
                    Text("Browse listings")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 1, green: 0.34, blue: 0.13))
                .padding(.horizontal, 32)
                .padding(.top, 8)
                Spacer()
            }
            .padding(.top, 48)
            .navigationTitle("Swap")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
