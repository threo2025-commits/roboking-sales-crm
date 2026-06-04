# Database Design Summary

Core entities:

- `User`: CRM user with role Owner, Manager, PA/Admin Assistant, Employee
- `Lead`: sales opportunity/client prospect
- `Client`: institution/company account
- `Contact`: person inside a client organization
- `Deal`: sales opportunity pipeline record
- `Followup`: reminders and daily follow-up dashboard
- `CallLog`: call details, objection, budget, product interest, recording link
- `FileAsset`: AWS S3 file metadata
- `EmailAccount`: employee Hostinger SMTP/IMAP configuration
- `EmailMessage`: outbound and inbound email history
- `EmailTemplate`: admin-created email templates
- `WhatsappTemplate`: admin-controlled WhatsApp templates
- `ChatConversation`, `ChatMember`, `ChatMessage`: internal chat system
- `ExcelImport`, `ExcelImportRow`: import history and duplicate/failed rows
- `Notification`, `AuditLog`, `Setting`: system tracking and config
