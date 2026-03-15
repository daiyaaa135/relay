import UIKit
import Capacitor
import WebKit

final class BridgeViewController: CAPBridgeViewController {

    // MARK: — Splash state

    private var splashOverlay: SplashOverlayController?
    private var splashDismissed = false
    private var dismissTimer: Timer?
    private var splashMountTime: Date = Date()

    /// Splash is always shown for at least this long, even on fast connections.
    private let minSplashDuration: TimeInterval = 2.0

    // KVO context — avoids conflicts with Capacitor's own observers
    private var kvoContext = 0

    // MARK: — Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        // We handle safe areas on the web side (CSS env(safe-area-inset-*)).
        // Prevent UIKit from applying additional automatic insets.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never

        // Keep the WebView from capturing iOS "scroll to top" taps globally.
        webView?.scrollView.scrollsToTop = false

        // ── Splash overlay ────────────────────────────────────────────────
        // Mount immediately so it covers the blank WKWebView during load.
        splashMountTime = Date()
        mountSplashOverlay()

        // Observe WebView load progress — dismiss splash as soon as the
        // first full navigation finishes (estimatedProgress reaches 1.0).
        webView?.addObserver(
            self,
            forKeyPath: #keyPath(WKWebView.estimatedProgress),
            options: .new,
            context: &kvoContext
        )

        // Hard cap: always dismiss after 4 s even if loading stalls.
        // This prevents the user from being stuck on the splash forever.
        dismissTimer = Timer.scheduledTimer(
            withTimeInterval: 4.0,
            repeats: false
        ) { [weak self] _ in
            self?.dismissSplash()
        }
    }

    deinit {
        // Safe to call even if the observer was already removed in dismissSplash()
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), context: &kvoContext)
        dismissTimer?.invalidate()
    }

    // MARK: — Status bar

    override var preferredStatusBarStyle: UIStatusBarStyle {
        if traitCollection.userInterfaceStyle == .dark { return .lightContent }
        if #available(iOS 13.0, *) { return .darkContent }
        return .default
    }

    // MARK: — KVO

    override func observeValue(
        forKeyPath keyPath: String?,
        of object: Any?,
        change: [NSKeyValueChangeKey: Any]?,
        context: UnsafeMutableRawPointer?
    ) {
        guard context == &kvoContext else {
            // Not our observation — pass up the chain
            super.observeValue(forKeyPath: keyPath, of: object, change: change, context: context)
            return
        }

        if keyPath == #keyPath(WKWebView.estimatedProgress),
           (webView?.estimatedProgress ?? 0) >= 1.0 {
            // Short pause (0.25 s) so the first rendered web frame is visible
            // before we start fading, preventing a flash of unstyled content.
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                self?.dismissSplash()
            }
        }
    }

    // MARK: — Private helpers

    private func mountSplashOverlay() {
        let overlay = SplashOverlayController()
        splashOverlay = overlay
        addChild(overlay)
        overlay.view.frame = view.bounds
        overlay.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        // Guarantee white even before SwiftUI renders its first frame
        overlay.view.backgroundColor = UIColor.white
        view.addSubview(overlay.view)
        overlay.didMove(toParent: self)
        // Trigger the icon entrance animation
        overlay.animateIn()
    }

    private func dismissSplash() {
        guard !splashDismissed, let overlay = splashOverlay else { return }
        splashDismissed = true

        // Stop the timer and the KVO to avoid duplicate dismissals
        dismissTimer?.invalidate()
        dismissTimer = nil
        webView?.removeObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), context: &kvoContext)

        splashOverlay = nil

        // Honour the minimum display duration so the icon is always visible.
        let elapsed  = Date().timeIntervalSince(splashMountTime)
        let remaining = max(0, minSplashDuration - elapsed)

        if remaining > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + remaining) {
                overlay.animateOut()
            }
        } else {
            overlay.animateOut()
        }
    }
}
