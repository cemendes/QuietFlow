import SwiftUI
import AppKit

/// An invisible NSViewRepresentable that installs a local NSEvent monitor
/// for the window. Catches Escape and Return even when a TextField is focused,
/// where SwiftUI's .keyboardShortcut and .onExitCommand are unreliable.
struct KeyboardResponder: NSViewRepresentable {
    var onEscape: (() -> Void)?
    var onReturn:  (() -> Void)?

    func makeNSView(context: Context) -> NSView {
        let view = MonitorView()
        view.onEscape = onEscape
        view.onReturn  = onReturn
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        guard let view = nsView as? MonitorView else { return }
        view.onEscape = onEscape
        view.onReturn  = onReturn
    }

    // MARK: - Internal NSView

    final class MonitorView: NSView {
        var onEscape: (() -> Void)?
        var onReturn:  (() -> Void)?
        private var monitor: Any?

        override func viewDidMoveToWindow() {
            super.viewDidMoveToWindow()
            removeMonitor()
            guard window != nil else { return }

            monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
                guard let self else { return event }
                switch event.keyCode {
                case 53: // Escape
                    DispatchQueue.main.async { self.onEscape?() }
                    return nil  // consume
                case 36, 76: // Return / numpad Enter
                    DispatchQueue.main.async { self.onReturn?() }
                    return nil  // consume
                default:
                    return event
                }
            }
        }

        override func viewWillMove(toWindow newWindow: NSWindow?) {
            if newWindow == nil { removeMonitor() }
            super.viewWillMove(toWindow: newWindow)
        }

        private func removeMonitor() {
            if let m = monitor { NSEvent.removeMonitor(m); monitor = nil }
        }
    }
}

// MARK: - Always-visible horizontal scrollbar

/// Apply as .background(AlwaysVisibleHScrollbar()) on a SwiftUI ScrollView.
/// Walks up the NSView hierarchy to find the backing NSScrollView and forces
/// the horizontal scroller to always be visible (legacy / non-overlay style).
struct AlwaysVisibleHScrollbar: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = HScrollConfigView()
        return view
    }
    func updateNSView(_ nsView: NSView, context: Context) {}

    final class HScrollConfigView: NSView {
        override func viewDidMoveToSuperview() {
            super.viewDidMoveToSuperview()
            // Defer so SwiftUI finishes inserting the full hierarchy first.
            DispatchQueue.main.async { self.configure() }
        }

        private func configure() {
            var candidate: NSView? = superview
            while let v = candidate {
                if let sv = v as? NSScrollView {
                    sv.hasHorizontalScroller   = true
                    sv.autohidesScrollers      = false
                    sv.horizontalScroller?.scrollerStyle = .legacy
                    return
                }
                candidate = v.superview
            }
        }
    }
}
