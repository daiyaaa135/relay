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

    // Condition badge semantic colors
    static let conditionNew  = Color(red: 0.0,   green: 0.784, blue: 0.588)   // #00C896
    static let conditionMint = Color(red: 0.0,   green: 0.761, blue: 0.831)   // #00C2D4
    static let conditionGood = Color(red: 0.231, green: 0.510, blue: 0.965)   // #3B82F6
    static let conditionFair = Color(red: 0.961, green: 0.651, blue: 0.137)   // #F5A623
    static let conditionPoor = Color(red: 0.937, green: 0.267, blue: 0.267)   // #EF4444
}

// MARK: - Primary gradient
extension LinearGradient {
    static var relayPrimary: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 1.0, green: 0.337, blue: 0.129),   // #FF5621
                Color(red: 1.0, green: 0.537, blue: 0.0)      // #FF8900
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
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

// MARK: - Primary Button (gradient)
struct RelayPrimaryButton: View {
    let title: String
    var isLoading = false
    var isDisabled = false
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                if isLoading {
                    ProgressView().tint(.white)
                } else {
                    Text(title)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                isDisabled
                    ? AnyView(Color.relayMuted.opacity(0.4))
                    : AnyView(LinearGradient.relayPrimary)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .shadow(color: Color.relayPrimary.opacity(isDisabled ? 0 : 0.3), radius: 8, x: 0, y: 4)
        }
        .disabled(isDisabled || isLoading)
        .scaleEffect(isPressed ? 0.97 : 1.0)
        .animation(.spring(response: 0.2, dampingFraction: 0.7), value: isPressed)
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in isPressed = true }
                .onEnded { _ in isPressed = false }
        )
    }
}

// MARK: - Secondary Button (outline)
struct RelaySecondaryButton: View {
    let title: String
    var icon: String? = nil
    var isLoading = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView().tint(.relayPrimary).scaleEffect(0.85)
                } else {
                    if let icon { Image(systemName: icon).font(.system(size: 14, weight: .semibold)) }
                    Text(title).font(.system(size: 15, weight: .semibold))
                }
            }
            .foregroundColor(.relayPrimary)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.relayPrimary.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.relayPrimary.opacity(0.25), lineWidth: 1))
        }
        .disabled(isLoading)
    }
}

// MARK: - Condition Badge
struct ConditionBadge: View {
    let condition: String

    private var badgeColor: Color {
        switch condition.lowercased() {
        case "new":                    return .conditionNew
        case "mint", "like_new":       return .conditionMint
        case "good", "excellent":      return .conditionGood
        case "fair":                   return .conditionFair
        case "poor":                   return .conditionPoor
        default:                       return .relayMuted
        }
    }

    var body: some View {
        Text(condition.capitalized)
            .font(.system(size: 10, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(badgeColor)
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

// MARK: - Haptics
struct Haptics {
    static func light()   { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
    static func medium()  { UIImpactFeedbackGenerator(style: .medium).impactOccurred() }
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func error()   { UINotificationFeedbackGenerator().notificationOccurred(.error) }
}

// MARK: - Shimmer modifier (skeleton loading)
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, Color.white.opacity(0.45), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 2)
                    .offset(x: phase * geo.size.width * 2 - geo.size.width)
                }
                .clipped()
            )
            .onAppear {
                withAnimation(.linear(duration: 1.4).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

extension View {
    func shimmer() -> some View { modifier(ShimmerModifier()) }
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
