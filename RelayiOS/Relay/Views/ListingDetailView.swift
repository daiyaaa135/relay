//
//  ListingDetailView.swift
//  Relay
//

import SwiftUI

struct ListingDetailView: View {
    let gadget: Gadget
    @EnvironmentObject var appState: AppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                AsyncImage(url: URL(string: gadget.image)) { phase in
                    switch phase {
                    case .success(let img): img.resizable().scaledToFit()
                    default: Color.gray.opacity(0.3)
                    }
                }
                .frame(height: 280)
                .frame(maxWidth: .infinity)
                .clipped()
                .cornerRadius(12)

                VStack(alignment: .leading, spacing: 8) {
                    Text(gadget.name)
                        .font(.title2.bold())
                    Text(gadget.brand)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(gadget.specs)
                        .font(.body)
                    if let desc = gadget.description, !desc.isEmpty {
                        Text(desc)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("\(gadget.credits) credits")
                            .font(.title3.bold())
                            .foregroundColor(Color(red: 1, green: 0.34, blue: 0.13))
                        Spacer()
                        Text("Condition: \(gadget.condition)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    if let loc = gadget.location {
                        Text("\(loc.city), \(loc.state)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal)

                Button {
                    // Start swap flow
                } label: {
                    Text("Start Swap")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 1, green: 0.34, blue: 0.13))
                .padding(.horizontal)
                .padding(.top, 8)
            }
            .padding(.bottom, 32)
        }
        .navigationBarTitleDisplayMode(.inline)
    }
}
