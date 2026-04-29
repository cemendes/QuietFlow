import SwiftUI
import WebKit
import Combine // Added to resolve EnvironmentObject constraint

struct LoginView: NSViewRepresentable {
    let url: URL
    @Binding var isPresented: Bool
    @Environment(AuthManager.self) var authManager: AuthManager
    
    func makeNSView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }
    
    func updateNSView(_ nsView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        nsView.load(request)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: LoginView
        
        init(_ parent: LoginView) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            if let url = webView.url {
                print("Loaded URL: \(url.absoluteString)")
                
                if url.absoluteString.contains("script.google.com") && !url.absoluteString.contains("ServiceLogin") {
                    webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
                        DispatchQueue.main.async {
                            self.parent.authManager.saveCookies(cookies)
                            self.parent.isPresented = false // Close the login view
                        }
                    }
                }
            }
        }
    }
}
