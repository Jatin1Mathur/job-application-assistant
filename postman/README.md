# Postman collection

A ready-made collection is in [`Job-Application-Assistant.postman_collection.json`](Job-Application-Assistant.postman_collection.json). All endpoints are listed in the [API reference](../docs/ARCHITECTURE.md#7-api-reference).

1. In Postman choose **Import** and select that file.
2. Run the requests in this order the first time:
   1. **Auth → Register** (change the email and password in the body first)
   2. **Auth → Login** (same email and password)
   3. **Resumes → Upload resume** (pick your PDF in the Body tab)
   4. **Applications → Create application**
3. After that, every other request works in any order.

You do not need to copy anything by hand. Login saves the `token`, Upload resume saves `resumeId`, and Create application saves `applicationId` as collection variables, and the other requests use them. The token is sent automatically as a Bearer token on every request except Health, Register and Login.

The token is valid for 24 hours. If you get a 401, run **Login** again. If the app runs somewhere else, change the `baseUrl` collection variable.
