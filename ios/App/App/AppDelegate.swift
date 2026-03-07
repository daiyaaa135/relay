import UIKit
import WebKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions:
        [UIApplication.LaunchOptionsKey: Any]?) -> Bool {

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.addPullToRefresh()
        }
        return true
    }

    func addPullToRefresh() {
        guard let rootVC = window?.rootViewController,
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

    @objc func handleRefresh(_ sender: UIRefreshControl) {
        guard let rootVC = window?.rootViewController,
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

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication,
        continue userActivity: NSUserActivity,
        restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(
            application, continue: userActivity,
            restorationHandler: restorationHandler)
    }

  func application(_ application: UIApplication,
      didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      NotificationCenter.default.post(
          name: .capacitorDidRegisterForRemoteNotifications,
          object: deviceToken
      )
  }

  func application(_ application: UIApplication,
      didFailToRegisterForRemoteNotificationsWithError error: Error) {
      NotificationCenter.default.post(
          name: .capacitorDidFailToRegisterForRemoteNotifications,
          object: error
      )
  }
}
