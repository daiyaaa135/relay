//
//  WelcomeView.swift
//  Rellaey IOS
//
//  Landing page matching the Next.js /welcome route
//

import SwiftUI

struct WelcomeView: View {
    @Binding var showLogin: Bool
    @State private var float1: CGFloat = 0
    @State private var float2: CGFloat = 0
    @State private var float3: CGFloat = 0

    var body: some View {
        ZStack(alignment: .bottom) {
            // ── Hero background ──
            Color.relayBackground.ignoresSafeArea()

            // Decorative circles
            ZStack {
                Circle()
                    .stroke(Color.relayPrimary.opacity(0.08), lineWidth: 1)
                    .frame(width: 340, height: 340)
                Circle()
                    .stroke(Color.relayPrimary.opacity(0.05), lineWidth: 1)
                    .frame(width: 500, height: 500)
                Circle()
                    .stroke(Color.relayPrimary.opacity(0.03), lineWidth: 1)
                    .frame(width: 660, height: 660)
            }
            .offset(y: -120)

            // Floating gadget icons
            VStack {
                ZStack {
                    FloatingGadget(systemImage: "iphone.gen3", size: 80, color: .relayPrimary, offset: float1)
                        .offset(x: -90, y: 20)
                    FloatingGadget(systemImage: "laptopcomputer", size: 68, color: Color(red: 0.2, green: 0.2, blue: 0.9).opacity(0.8), offset: float2)
                        .offset(x: 70, y: -10)
                    FloatingGadget(systemImage: "headphones", size: 60, color: Color(red: 0.1, green: 0.7, blue: 0.5).opacity(0.8), offset: float3)
                        .offset(x: 20, y: 60)
                }
                .frame(height: 220)
                .padding(.top, 80)

                Spacer()
            }

            // ── Bottom card ──
            VStack(alignment: .leading, spacing: 0) {
                // Handle bar
                RoundedRectangle(cornerRadius: 3)
                    .fill(Color.relayMuted.opacity(0.3))
                    .frame(width: 36, height: 4)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 12)
                    .padding(.bottom, 28)

                Text("Welcome to Relay")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.relayText)

                Text("Tech rotation, made simple. Swap gadgets with people near you.")
                    .font(.system(size: 14, weight: .regular))
                    .foregroundColor(.relayMuted)
                    .padding(.top, 8)
                    .padding(.bottom, 32)

                // Continue with Email
                Button {
                    showLogin = true
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "envelope.fill")
                            .font(.system(size: 15))
                        Text("Continue with Email")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.relayPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }

                // Or divider
                HStack {
                    Rectangle().fill(Color.relayMuted.opacity(0.2)).frame(height: 1)
                    Text("or")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.relayMuted)
                        .padding(.horizontal, 12)
                    Rectangle().fill(Color.relayMuted.opacity(0.2)).frame(height: 1)
                }
                .padding(.vertical, 20)

                // Google (placeholder — native Sign In With Apple could go here)
                Button {} label: {
                    HStack(spacing: 10) {
                        Image(systemName: "applelogo")
                            .font(.system(size: 15, weight: .medium))
                        Text("Continue with Apple")
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundColor(.relayText)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(Color.relayInput.opacity(0.7))
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.relayMuted.opacity(0.2), lineWidth: 1)
                    )
                }

                Text("By continuing you agree to our Terms of Service and Privacy Policy.")
                    .font(.system(size: 11))
                    .foregroundColor(.relayMuted.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 20)
                    .padding(.bottom, 8)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 32)
            .background(
                Color.relaySurface
                    .clipShape(
                        .rect(
                            topLeadingRadius: 28,
                            bottomLeadingRadius: 0,
                            bottomTrailingRadius: 0,
                            topTrailingRadius: 28
                        )
                    )
                    .shadow(color: .black.opacity(0.08), radius: 20, x: 0, y: -4)
            )
        }
        .ignoresSafeArea(edges: .bottom)
        .onAppear { startFloating() }
    }

    private func startFloating() {
        withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
            float1 = -12
        }
        withAnimation(.easeInOut(duration: 3.5).repeatForever(autoreverses: true).delay(0.8)) {
            float2 = -10
        }
        withAnimation(.easeInOut(duration: 4).repeatForever(autoreverses: true).delay(1.6)) {
            float3 = -8
        }
    }
}

private struct FloatingGadget: View {
    let systemImage: String
    let size: CGFloat
    let color: Color
    let offset: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28)
                .fill(color.opacity(0.12))
                .frame(width: size + 20, height: size + 20)
            Image(systemName: systemImage)
                .font(.system(size: size * 0.55, weight: .light))
                .foregroundColor(color)
        }
        .offset(y: offset)
        .shadow(color: color.opacity(0.15), radius: 12, x: 0, y: 6)
    }
}
