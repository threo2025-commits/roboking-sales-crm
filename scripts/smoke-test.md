# Local Smoke Test Checklist

Run these after `npm install`, database migration, and seed.

1. Backend health: open `http://localhost:5000/health`.
2. Frontend: open `http://localhost:3000`.
3. Login as `owner / ChangeMe@123`.
4. Verify one-login rule: try logging in with the same ID in another browser; it should block until force logout.
5. Team page: create an employee ID, disable/enable it, force logout it.
6. Leads page: create a lead with phone/email, then try adding duplicate; warning/block should appear.
7. Imports page: upload Excel, preview duplicates, then commit with/without override.
8. Follow-ups page: mark follow-up Done, Missed, and Reschedule.
9. Communications page: open WhatsApp prefill, send email draft, and submit call log with recording.
10. Notifications page: PA/Manager sends a reminder to an employee.
11. Chat page: create group/direct chat and send a message.
12. Audit page: confirm actions are recorded.
