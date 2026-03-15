import UIKit

// Pure UIKit splash overlay.
// AppLogo is a transparent-background PNG; the view's #FBFBFB background
// matches LaunchScreen.storyboard exactly for a seamless one-screen effect.

final class SplashOverlayController: UIViewController {

    // MARK: — Subviews

    private let logoView: UIImageView = {
        let iv = UIImageView(image: UIImage(named: "AppLogo"))
        iv.contentMode = .scaleAspectFit
        return iv
    }()

    // MARK: — Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()

        // Match the splash image's exact background (#FBFBFB).
        view.backgroundColor = UIColor(red: 251/255, green: 251/255, blue: 251/255, alpha: 1)

        view.addSubview(logoView)

        // Start fully visible — the OS LaunchScreen already showed the logo,
        // so we appear at 100% opacity immediately for a seamless handoff.
        logoView.alpha     = 1.0
        logoView.transform = .identity
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        // Centre within the safe area for optical balance
        let size: CGFloat = min(view.bounds.width * 0.72, 280)
        let safeTop    = view.safeAreaInsets.top
        let safeBottom = view.safeAreaInsets.bottom
        let usableH    = view.bounds.height - safeTop - safeBottom
        let originX    = (view.bounds.width - size) / 2
        let originY    = safeTop + (usableH - size) / 2

        logoView.frame = CGRect(x: originX, y: originY, width: size, height: size)
    }

    // MARK: — Animations

    // animateIn is a no-op: the overlay mounts fully visible so it matches
    // the OS LaunchScreen exactly, giving a seamless handoff with no flash.
    func animateIn() {}

    func animateOut(completion: (() -> Void)? = nil) {
        UIView.animate(
            withDuration: 0.38,
            delay: 0,
            options: .curveEaseInOut,
            animations: {
                self.logoView.transform = CGAffineTransform(scaleX: 1.06, y: 1.06)
                self.logoView.alpha     = 0
                self.view.alpha         = 0
            },
            completion: { _ in
                self.willMove(toParent: nil)
                self.view.removeFromSuperview()
                self.removeFromParent()
                completion?()
            }
        )
    }
}
