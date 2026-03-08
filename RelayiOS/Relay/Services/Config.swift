//
//  Config.swift
//  Relay
//
//  Supabase and API config (client-safe values only). Server secrets stay in .env.local on the server.
//

import Foundation

enum Config {
    static let supabaseURL = ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://zuohjyxetrtbutamqoiw.supabase.co"
    static let supabaseAnonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "sb_publishable_8zrQu-y_pZHyb_Cbx9cQ2g_V7MgHR63"
    static let apiBaseURL = ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000"
}
