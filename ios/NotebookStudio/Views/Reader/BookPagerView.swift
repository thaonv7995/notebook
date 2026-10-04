import SwiftUI
import UIKit

/// Hosts a SwiftUI View inside UIPageViewController with page index tracking.
final class PageHostingController: UIHostingController<AnyView> {
    var pageIndex: Int

    init(pageIndex: Int, rootView: AnyView) {
        self.pageIndex = pageIndex
        super.init(rootView: rootView)
        self.view.backgroundColor = .clear
    }

    @MainActor required dynamic init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

/// UIViewControllerRepresentable wrapping UIPageViewController with realistic 3D book page curl animation.
/// Inspired by the reader architecture in bilingual-app with page caching and seamless 0-indexed page flips.
struct BookPagerView<Content: View>: UIViewControllerRepresentable {
    var pageCount: Int
    @Binding var currentPage: Int
    var transitionStyle: UIPageViewController.TransitionStyle = .pageCurl
    var revision: Int = 0
    @ViewBuilder var content: (Int) -> Content

    func makeUIViewController(context: Context) -> UIPageViewController {
        let options: [UIPageViewController.OptionsKey: Any]
        if transitionStyle == .pageCurl {
            options = [UIPageViewController.OptionsKey.spineLocation: UIPageViewController.SpineLocation.min.rawValue]
        } else {
            options = [UIPageViewController.OptionsKey.interPageSpacing: 16]
        }

        let pvc = UIPageViewController(
            transitionStyle: transitionStyle,
            navigationOrientation: .horizontal,
            options: options
        )
        pvc.dataSource = context.coordinator
        pvc.delegate = context.coordinator
        pvc.view.backgroundColor = .clear

        let initialVC = context.coordinator.createVC(page: currentPage)
        pvc.setViewControllers([initialVC], direction: .forward, animated: false)

        return pvc
    }

    func updateUIViewController(_ uiViewController: UIPageViewController, context: Context) {
        context.coordinator.parent = self

        // Do not interrupt while user is mid-swipe
        if context.coordinator.pendingPage != nil {
            return
        }

        let currentVCs = uiViewController.viewControllers ?? []
        if let currentVC = currentVCs.first as? PageHostingController {
            if currentVC.pageIndex == currentPage {
                if context.coordinator.lastRevision != revision {
                    context.coordinator.pruneAllCache()
                    currentVC.rootView = AnyView(content(currentPage))
                    context.coordinator.lastRevision = revision
                }
                return
            }
        }

        // Programmatic jump to page (from scrubber, TOC, bookmark)
        let dir: UIPageViewController.NavigationDirection = (currentPage >= context.coordinator.lastPage) ? .forward : .reverse
        context.coordinator.lastPage = currentPage
        context.coordinator.lastRevision = revision
        let vc = context.coordinator.createVC(page: currentPage)
        uiViewController.setViewControllers([vc], direction: dir, animated: true)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            context.coordinator.preloadNeighbors()
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
        var parent: BookPagerView
        var lastPage: Int
        var lastRevision: Int = -1
        var pendingPage: Int?
        var cachedVCs: [Int: PageHostingController] = [:]

        init(_ parent: BookPagerView) {
            self.parent = parent
            self.lastPage = parent.currentPage
            self.lastRevision = parent.revision
        }

        func pruneAllCache() {
            cachedVCs.removeAll()
        }

        func pruneCache() {
            let center = parent.currentPage
            let threshold = 3
            let keys = cachedVCs.keys
            for key in keys {
                if abs(key - center) > threshold {
                    cachedVCs.removeValue(forKey: key)
                }
            }
        }

        func preloadNeighbors() {
            let p = parent.currentPage
            if p > 0 {
                _ = createVC(page: p - 1).view
            }
            if p < parent.pageCount - 1 {
                _ = createVC(page: p + 1).view
            }
        }

        func createVC(page: Int) -> PageHostingController {
            if let cached = cachedVCs[page] {
                if lastRevision != parent.revision {
                    cached.rootView = AnyView(parent.content(page))
                }
                pruneCache()
                return cached
            }

            if page >= 0 && page < parent.pageCount {
                let view = AnyView(parent.content(page))
                let vc = PageHostingController(pageIndex: page, rootView: view)
                cachedVCs[page] = vc
                pruneCache()
                return vc
            } else {
                let empty = AnyView(Color.clear)
                return PageHostingController(pageIndex: page, rootView: empty)
            }
        }

        func pageViewController(_ pageViewController: UIPageViewController, viewControllerBefore viewController: UIViewController) -> UIViewController? {
            guard let currentVC = viewController as? PageHostingController else { return nil }
            if currentVC.pageIndex > 0 {
                return createVC(page: currentVC.pageIndex - 1)
            }
            return nil
        }

        func pageViewController(_ pageViewController: UIPageViewController, viewControllerAfter viewController: UIViewController) -> UIViewController? {
            guard let currentVC = viewController as? PageHostingController else { return nil }
            if currentVC.pageIndex < parent.pageCount - 1 {
                return createVC(page: currentVC.pageIndex + 1)
            }
            return nil
        }

        func pageViewController(_ pageViewController: UIPageViewController, willTransitionTo pendingViewControllers: [UIViewController]) {
            if let vc = pendingViewControllers.first as? PageHostingController {
                pendingPage = vc.pageIndex
            }
        }

        func pageViewController(_ pageViewController: UIPageViewController, didFinishAnimating finished: Bool, previousViewControllers: [UIViewController], transitionCompleted completed: Bool) {
            if completed, let p = pendingPage {
                parent.currentPage = p
                lastPage = p
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                    self?.preloadNeighbors()
                }
            }
            pendingPage = nil
        }

        func pageViewController(_ pageViewController: UIPageViewController, spineLocationFor orientation: UIInterfaceOrientation) -> UIPageViewController.SpineLocation {
            pageViewController.isDoubleSided = false
            return .min
        }
    }
}
