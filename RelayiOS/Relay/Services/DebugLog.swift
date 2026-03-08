//
//  DebugLog.swift
//  Relay
//
//  Sends debug payloads to Next.js /api/debug-log so they appear in .cursor/debug.log.
//  On device: set Config.apiBaseURL to your Mac IP (e.g. http://192.168.1.x:3000) and run `npm run dev` on Mac.
//

import Foundation

enum DebugLog {
    static func log(location: String, message: String, data: [String: Any] = [:], hypothesisId: String? = nil) {
        var payload: [String: Any] = [
            "location": location,
            "message": message,
            "data": data,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
        ]
        if let h = hypothesisId { payload["hypothesisId"] = h }
        guard let url = URL(string: Config.apiBaseURL + "/api/debug-log"),
              let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = body
        URLSession.shared.dataTask(with: req) { _, _, _ in }.resume()
    }
}
