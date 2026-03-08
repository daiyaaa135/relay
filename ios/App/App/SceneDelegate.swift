import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let _ = (scene as? UIWindowScene) else { return }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.addPullToRefresh()
        }
    }

    func sceneDidDisconnect(_ scene: UIScene) {}

    func sceneDidBecomeActive(_ scene: UIScene) {}

    func sceneWillResignActive(_ scene: UIScene) {}

    func sceneWillEnterForeground(_ scene: UIScene) {}

    func sceneDidEnterBackground(_ scene: UIScene) {}

    // MARK: - Pull to refresh (moved from AppDelegate for scene-based lifecycle)

    private func addPullToRefresh() {
        guard let window = window,
              let rootVC = window.rootViewController,
              let webView = rootVC.view
                  .subviews
                  .compactMap({ $0 as? WKWebView })
                  .first else { return }

        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            self,
            action: #selector(handleRefresh(_:)),
            for: .valueChanged
        )
        webView.scrollView.addSubview(refreshControl)
        webView.scrollView.bounces = true
    }

    @objc private func handleRefresh(_ sender: UIRefreshControl) {
        guard let window = window,
              let rootVC = window.rootViewController,
              let webView = rootVC.view
                  .subviews
                  .compactMap({ $0 as? WKWebView })
                  .first else {
            sender.endRefreshing()
            return
        }

        webView.evaluateJavaScript(
            "window.dispatchEvent(new Event('nativeRefresh'))"
        )
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            sender.endRefreshing()
        }
    }
}
