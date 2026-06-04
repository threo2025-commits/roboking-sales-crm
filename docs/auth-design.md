# Authentication Design

## Final MVP decision

RoboKing CRM uses custom login IDs and passwords, not self-signup and not Cognito for MVP.

- Owner/Manager creates employee login IDs.
- Login ID can be any internal ID such as `neha.sales01` or `employee`.
- One active session is allowed per login ID.
- A second login is blocked with a message asking the employee to contact Owner/Manager.
- Owner/Manager can force logout an active session.
- Employees can request password reset from the login page.
- Owner/Manager can reset the password and the user must login again.
- All login, force logout and password reset actions are audit logged.

## Core tables

- `User`
- `UserSession`
- `PasswordResetRequest`
- `AuditLog`

## Default seed users

| Role | Login ID | Password |
|---|---|---|
| Owner | `owner` | `ChangeMe@123` |
| Manager | `manager` | `ChangeMe@123` |
| PA/Admin Assistant | `pa` | `ChangeMe@123` |
| Employee | `employee` | `ChangeMe@123` |

Change all seed passwords before production.
