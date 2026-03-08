//
//  Config.swift
//  Rellaey IOS
//
//  Created by Serena Chan on 3/8/26.
//


//
//  Config.swift
//  Relay
//
//  Set Supabase URL and anon key (same as .env.local in the web app).
//  Option 1: Replace the fallback strings below with values from .env.local:
//    NEXT_PUBLIC_SUPABASE_URL  → supabaseURL
//    NEXT_PUBLIC_SUPABASE_ANON_KEY  → supabaseAnonKey
//  Option 2: In Xcode, Edit Scheme → Run → Arguments → Environment Variables,
//    add SUPABASE_URL and SUPABASE_ANON_KEY (these override the fallbacks).
//

import Foundation

enum Config {
    static let supabaseURL = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://zuohjyxetrtbutamqoiw.supabase.co"
    static let supabaseAnonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "sb_publishable_8zrQu-y_pZHyb_Cbx9cQ2g_V7MgHR63"
    static let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000"
}
