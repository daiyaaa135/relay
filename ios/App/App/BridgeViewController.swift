import UIKit
import Capacitor

final class BridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // We handle safe areas on the web side (CSS env(safe-area-inset-*)).
        // Prevent UIKit from applying additional automatic insets.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never

        // Keep the WebView from capturing iOS "scroll to top" taps globally.
        webView?.scrollView.scrollsToTop = false
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        if traitCollection.userInterfaceStyle == .dark {
            return .lightContent
        }
        if #available(iOS 13.0, *) {
            return .darkContent
        }
        return .default
    }
}
