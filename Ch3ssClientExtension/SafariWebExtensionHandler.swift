import SafariServices
import os.log

@objc(SafariWebExtensionHandler)
class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

    func beginRequest(with context: NSExtensionContext) {
        let request = context.inputItems.first as? NSExtensionItem
        let message: Any?
        if #available(iOS 15.0, *) {
            message = request?.userInfo?[SFExtensionMessageKey]
        } else {
            message = nil
        }

        os_log(.default, "Ch3ssClient native message: %@", String(describing: message))

        let response = NSExtensionItem()
        if #available(iOS 15.0, *) {
            response.userInfo = [SFExtensionMessageKey: ["ok": true, "app": "Ch3ss Client", "version": "1.2"]]
        }
        context.completeRequest(returningItems: [response], completionHandler: nil)
    }
}
