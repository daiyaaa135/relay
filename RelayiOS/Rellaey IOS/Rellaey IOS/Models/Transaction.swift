//
//  Transaction.swift
//  Rellaey IOS
//

import Foundation

struct Transaction: Identifiable, Codable {
    let id: String
    let profileId: String
    let amount: Int
    let type: String        // listing_credit | swap_debit | swap_credit | monthly_fee | referral_bonus | system_adjustment
    var description: String?
    var referenceId: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case profileId = "profile_id"
        case amount, type, description
        case referenceId = "reference_id"
        case createdAt = "created_at"
    }
}

extension Transaction {
    var isCredit: Bool {
        amount > 0
    }

    var typeLabel: String {
        switch type {
        case "listing_credit":    return "Listing Credit"
        case "swap_debit":        return "Swap Debit"
        case "swap_credit":       return "Swap Credit"
        case "monthly_fee":       return "Membership Fee"
        case "referral_bonus":    return "Referral Bonus"
        case "system_adjustment": return "Adjustment"
        default:                  return type.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    var formattedDate: String {
        guard let dateStr = createdAt else { return "" }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = isoFormatter.date(from: dateStr) else { return String(dateStr.prefix(10)) }
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f.string(from: date)
    }
}
