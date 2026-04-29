import Foundation
import SwiftUI
import WebKit
import Combine

@Observable
@MainActor
class AuthManager {
    var isSignedIn: Bool = false
    var cookies: [HTTPCookie] = []
    
    init() {
        // In a full app, we would load these from Keychain
        checkSignInStatus()
    }
    
    func checkSignInStatus() {
        if let cookies = HTTPCookieStorage.shared.cookies, !cookies.isEmpty {
            self.cookies = cookies
            self.isSignedIn = true
        }
    }
    
    func saveCookies(_ cookies: [HTTPCookie]) {
        self.cookies = cookies
        self.isSignedIn = !cookies.isEmpty
        
        // Inject into shared storage for URLSession
        for cookie in cookies {
            HTTPCookieStorage.shared.setCookie(cookie)
        }
        
        print("Saved \(cookies.count) cookies.")
    }
    
    func signOut() {
        self.cookies = []
        self.isSignedIn = false
        
        if let cookies = HTTPCookieStorage.shared.cookies {
            for cookie in cookies {
                HTTPCookieStorage.shared.deleteCookie(cookie)
            }
        }
    }
}

