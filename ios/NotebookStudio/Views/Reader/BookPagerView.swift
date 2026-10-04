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
/// Modeled faithfully after bilingual-app BookPagerView with page caching, double-sided landscape/iPad reading mode,
/// and seamless 0-indexed page flips.
struct BookPagerView<Content: View>: UIViewControllerRepresentable {
    var pageCount: Int
    @Binding var currentPage: Int
    var transitionStyle: UIPageViewController.TransitionStyle = .pageCurl
    var isDoubleSided: Bool = false
    var revision: Int = 0
    @ViewBuilder var content: (Int) -> Content

    func makeUIViewController(context: Context) -> UIPageViewController {
        let isDouble = isDoubleSided && transitionStyle == .pageCurl
        let options: [UIPageViewController.OptionsKey: Any]
        if transitionStyle == .pageCurl {
            options = [UIPageViewController.OptionsKey.spineLocation: (isDouble ? UIPageViewController.SpineLocation.mid : UIPageViewController.SpineLocation.min).rawValue]
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

        if isDouble {
            pvc.isDoubleSided = true
            let leftPage = (currentPage / 2) * 2
            let rightPage = leftPage + 1
            let leftVC = context.coordinator.createVC(page: leftPage)
            let rightVC = context.coordinator.createVC(page: rightPage)
            pvc.setViewControllers([leftVC, rightVC], direction: .forward, animated: false)
        } else {
            pvc.isDoubleSided = false
            let initialVC = context.coordinator.createVC(page: currentPage)
            pvc.setViewControllers([initialVC], direction: .forward, animated: false)
        }

        return pvc
    }

    func updateUIViewController(_ uiViewController: UIPageViewController, context: Context) {
        context.coordinator.parent = self

        // Do not interrupt while user is mid-swipe
        if context.coordinator.pendingPage != nil {
            return
        }

        let currentVCs = uiViewController.viewControllers ?? []
        let isDouble = isDoubleSided && transitionStyle == .pageCurl

        if isDouble {
            let leftPage = (currentPage / 2) * 2
            let rightPage = leftPage + 1

            var needsUpdate = true
            if currentVCs.count == 2,
               let leftVC = currentVCs[0] as? PageHostingController,
               let rightVC = currentVCs[1] as? PageHostingController {
                if leftVC.pageIndex == leftPage && rightVC.pageIndex == rightPage {
                    if context.coordinator.lastRevision != revision {
                        leftVC.rootView = AnyView(content(leftPage))
                        if rightPage < pageCount {
                            rightVC.rootView = AnyView(content(rightPage))
                        }
                        context.coordinator.lastRevision = revision
                    }
                    needsUpdate = false
                }
            }

            if needsUpdate {
                let dir: UIPageViewController.NavigationDirection = (leftPage >= context.coordinator.lastPage) ? .forward : .reverse
                context.coordinator.lastPage = leftPage
                context.coordinator.lastRevision = revision
                let leftVC = context.coordinator.createVC(page: leftPage)
                let rightVC = context.coordinator.createVC(page: rightPage)

                if uiViewController.spineLocation == .mid {
                    uiViewController.setViewControllers([leftVC, rightVC], direction: dir, animated: false)
                }

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    context.coordinator.preloadNeighbors()
                }
            }
        } else {
            var needsUpdate = true
            if currentVCs.count == 1,
               let vc = currentVCs[0] as? PageHostingController {
                if vc.pageIndex == currentPage {
                    if context.coordinator.lastRevision != revision {
                        context.coordinator.pruneAllCache()
                        vc.rootView = AnyView(content(currentPage))
                        context.coordinator.lastRevision = revision
                    }
                    needsUpdate = false
                }
            }

            if needsUpdate {
                let dir: UIPageViewController.NavigationDirection = (currentPage >= context.coordinator.lastPage) ? .forward : .reverse
                let shouldAnimate = UIDevice.current.userInterfaceIdiom == .phone
                    && context.coordinator.lastPage != -1
                    && context.coordinator.lastPage != currentPage
                context.coordinator.lastPage = currentPage
                context.coordinator.lastRevision = revision
                let vc = context.coordinator.createVC(page: currentPage)

                if uiViewController.spineLocation != .mid {
                    uiViewController.setViewControllers([vc], direction: dir, animated: shouldAnimate)
                }

                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    context.coordinator.preloadNeighbors()
                }
            }
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
            self.lastPage = -1
            self.lastRevision = parent.revision
        }

        func pruneAllCache() {
            cachedVCs.removeAll()
        }

        func pruneCache() {
            let center = parent.currentPage
            let threshold = parent.isDoubleSided ? 6 : 3
            let keys = cachedVCs.keys
            for key in keys {
                if abs(key - center) > threshold {
                    cachedVCs.removeValue(forKey: key)
                }
            }
        }

        func preloadNeighbors() {
            let p = parent.currentPage
            if parent.isDoubleSided && parent.transitionStyle == .pageCurl {
                let leftPage = (p / 2) * 2
                let rightPage = leftPage + 1
                if leftPage >= 2 {
                    _ = createVC(page: leftPage - 2).view
                    _ = createVC(page: leftPage - 1).view
                }
                if rightPage + 2 < parent.pageCount {
                    _ = createVC(page: rightPage + 1).view
                    _ = createVC(page: rightPage + 2).view
                }
            } else {
                if p > 0 {
                    _ = createVC(page: p - 1).view
                }
                if p < parent.pageCount - 1 {
                    _ = createVC(page: p + 1).view
                }
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
                let empty = AnyView(
                    Color(hex: "0f172a")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                )
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
            if parent.isDoubleSided && parent.transitionStyle == .pageCurl {
                let maxPage = parent.pageCount % 2 == 1 ? parent.pageCount : parent.pageCount - 1
                if currentVC.pageIndex < maxPage {
                    return createVC(page: currentVC.pageIndex + 1)
                }
            } else {
                if currentVC.pageIndex < parent.pageCount - 1 {
                    return createVC(page: currentVC.pageIndex + 1)
                }
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
                let normalized = (parent.isDoubleSided && parent.transitionStyle == .pageCurl) ? ((p / 2) * 2) : p
                parent.currentPage = normalized
                lastPage = normalized
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                    self?.preloadNeighbors()
                }
            }
            pendingPage = nil
        }

        func pageViewController(_ pageViewController: UIPageViewController, spineLocationFor orientation: UIInterfaceOrientation) -> UIPageViewController.SpineLocation {
            let isDouble = parent.isDoubleSided && parent.transitionStyle == .pageCurl
            if isDouble {
                pageViewController.isDoubleSided = true
                let leftPage = (parent.currentPage / 2) * 2
                let rightPage = leftPage + 1

                let currentVCs = pageViewController.viewControllers ?? []
                if currentVCs.count != 2 {
                    let leftVC = createVC(page: leftPage)
                    let rightVC = createVC(page: rightPage)
                    pageViewController.setViewControllers([leftVC, rightVC], direction: .forward, animated: false)
                }
                return .mid
            } else {
                pageViewController.isDoubleSided = false
                let currentVCs = pageViewController.viewControllers ?? []
                if currentVCs.count != 1 {
                    let vc = createVC(page: parent.currentPage)
                    pageViewController.setViewControllers([vc], direction: .forward, animated: false)
                }
                return .min
            }
        }
    }
}
