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

    // KVO context must be static so its address is stable for the entire
    // app lifetime — instance vars are NOT guaranteed stable across calls.
    private static var kvoContext: UInt8 = 0
    private var kvoObserving = false   // guards against double remove/crash

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
        if let wv = webView {
            wv.addObserver(
                self,
                forKeyPath: #keyPath(WKWebView.estimatedProgress),
                options: .new,
                context: &BridgeViewController.kvoContext
            )
            kvoObserving = true
        }

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
        // Only remove if we actually registered — double-remove crashes the app.
        if kvoObserving {
            webView?.removeObserver(
                self,
                forKeyPath: #keyPath(WKWebView.estimatedProgress),
                context: &BridgeViewController.kvoContext
            )
        }
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
        guard context == &BridgeViewController.kvoContext else {
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

    // MARK: — WKWebView process crash recovery

    /// Called by WebKit whenever the web content process is terminated (OOM, crash, etc.).
    /// CAPBridgeViewController may or may not implement this; override unconditionally to
    /// ensure we always reload instead of showing a blank screen.
    override func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        print("[BridgeViewController] Web content process terminated — reloading")
        // Reset our splash guard so a new splash shows while the page reloads.
        splashDismissed = false
        splashMountTime = Date()
        mountSplashOverlay()
        // Delegate to super (Capacitor's own handler) then reload.
        super.webViewWebContentProcessDidTerminate(webView)
    }

    private func dismissSplash() {
        guard !splashDismissed, let overlay = splashOverlay else { return }
        splashDismissed = true

        // Stop the timer and the KVO to avoid duplicate dismissals
        dismissTimer?.invalidate()
        dismissTimer = nil
        if kvoObserving {
            kvoObserving = false
            webView?.removeObserver(
                self,
                forKeyPath: #keyPath(WKWebView.estimatedProgress),
                context: &BridgeViewController.kvoContext
            )
        }

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
