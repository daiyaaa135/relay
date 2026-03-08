//
//  Theme.swift
//  Rellaey IOS
//
//  Design tokens matching the Relay Next.js design system
//

import SwiftUI

// MARK: - Brand Colors
extension Color {
    /// Primary orange #FF5721
    static let relayPrimary = Color(red: 1.0, green: 0.341, blue: 0.129)
    /// Page background #F3F4F7
    static let relayBackground = Color(red: 0.953, green: 0.957, blue: 0.969)
    /// Card / surface white
    static let relaySurface = Color(UIColor.systemBackground)
    /// Near-black text #1F2129
    static let relayText = Color(red: 0.122, green: 0.129, blue: 0.161)
    /// Muted gray #7C8292
    static let relayMuted = Color(red: 0.486, green: 0.510, blue: 0.573)
    /// Input background #E3E5EB
    static let relayInput = Color(red: 0.890, green: 0.898, blue: 0.922)
}

// MARK: - Glass Effect
struct GlassBackground: View {
    var cornerRadius: CGFloat = 20
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius)
                .fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(Color.white.opacity(0.3), lineWidth: 0.5)
        }
    }
}

// MARK: - Relay Input Field
struct RelayInputField: View {
    let systemImage: String
    let placeholder: String
    @Binding var text: String
    var isSecure = false
    @State private var isVisible = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(.relayMuted)
                .frame(width: 20)

            if isSecure && !isVisible {
                SecureField(placeholder, text: $text)
                    .font(.system(size: 15, weight: .medium))
            } else {
                TextField(placeholder, text: $text)
                    .font(.system(size: 15, weight: .medium))
                    .autocapitalization(.none)
                    .autocorrectionDisabled()
            }

            if isSecure {
                Button {
                    isVisible.toggle()
                } label: {
                    Image(systemName: isVisible ? "eye" : "eye.slash")
                        .font(.system(size: 14))
                        .foregroundColor(.relayMuted)
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .background(Color.relayInput.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

// MARK: - Primary Button
struct RelayPrimaryButton: View {
    let title: String
    var isLoading = false
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(isDisabled ? Color.relayMuted.opacity(0.4) : Color.relayPrimary)
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .disabled(isDisabled || isLoading)
    }
}

// MARK: - Condition Badge
struct ConditionBadge: View {
    let condition: String
    var body: some View {
        Text(condition)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(.relayText)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Credit Badge
struct CreditBadge: View {
    let credits: Int
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .font(.system(size: 9, weight: .bold))
            Text("\(credits)")
                .font(.system(size: 11, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.relayPrimary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .shadow(color: Color.relayPrimary.opacity(0.4), radius: 6, x: 0, y: 3)
    }
}

// MARK: - Set toggle helper
extension Set {
    mutating func toggle(_ element: Element) {
        if contains(element) { remove(element) } else { insert(element) }
    }
}

// MARK: - Star Rating
struct StarRating: View {
    let rating: Double
    let count: Int?
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<5) { i in
                Image(systemName: Double(i) < rating ? "star.fill" : "star")
                    .font(.system(size: 10))
                    .foregroundColor(Double(i) < rating ? .yellow : .relayMuted.opacity(0.4))
            }
            if let count = count {
                Text("(\(count))")
                    .font(.system(size: 10))
                    .foregroundColor(.relayMuted)
            }
        }
    }
}
